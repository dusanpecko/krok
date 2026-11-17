import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import * as ExcelJS from 'exceljs'
import { generateSlug } from '@/lib/slug'
import { sendTemplateEmail } from '@/lib/email/send'
import { visibleQuestions, type AdminEventSummary, type EventAdminData, type EventInput, type EventQuestion, type EventStatus, type InviteInput, type PublicEvent, type QuestionType } from './events-shared'

export * from './events-shared'

/**
 * Podujatia webu dcza.sk (066, 067) – prihlášky na osobnú pozvánku.
 * Pozvaný dostane odkaz /podujatia/<slug>?k=<token>; cez neho prihlášku odošle aj neskôr zmení.
 * Pozvánky poštou: spoločný odkaz (QR) ?k=<public_token> – kto sa cez neho prihlási, pribudne medzi pozvaných
 * (source 'public') s vlastným odkazom, ktorý dostane v potvrdení.
 * Serverový modul (service role), logika aj pre budúce API.
 */

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const EVENT_COLUMNS = 'id, slug, title, event_when, intro, thanks_text, closes_at, status, questions, public_token, created_at'
const INVITE_COLUMNS = 'id, token, salutation, first_name, last_name, email, group_name, note, sent_at, send_count, opened_at, source'
const RESPONSE_COLUMNS = 'id, invite_id, first_name, last_name, email, answers, created_at, updated_at'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clean = (s: string | null | undefined) => {
  const t = (s ?? '').trim()
  return t || null
}

export const dczaBaseUrl = () => (process.env.DCZA_BASE_URL?.trim() || 'https://www.dcza.sk').replace(/\/+$/, '')
export const rsvpUrl = (slug: string, token: string) => `${dczaBaseUrl()}/podujatia/${slug}?k=${token}`
const newToken = () => randomBytes(16).toString('base64url')
/** kratší token spoločného odkazu – menší a čitateľnejší QR kód */
const newPublicToken = () => randomBytes(6).toString('base64url')
export const PUBLIC_GROUP = 'Poštou (QR)'

/** Prihlasovanie je otvorené (príprava = na skúšku cez vlastnú pozvánku, pred rozoslaním). */
export function isEventOpen(e: { status: EventStatus; closes_at: string | null }): boolean {
  if (e.status === 'closed') return false
  return !e.closes_at || new Date(e.closes_at).getTime() > Date.now()
}

function normalizeQuestions(list: EventQuestion[]): EventQuestion[] {
  const out: EventQuestion[] = []
  const used = new Set<string>()
  for (const q of list) {
    const label = (q.label ?? '').trim()
    if (!label) continue
    let id = (q.id ?? '').trim() || generateSlug(label).slice(0, 40) || 'otazka'
    while (used.has(id)) id = `${id}-2`
    used.add(id)
    const type: QuestionType = (['text', 'textarea', 'choice'] as const).includes(q.type) ? q.type : 'text'
    const options = type === 'choice' ? [...new Set((q.options ?? []).map((o) => o.trim()).filter(Boolean))] : []
    out.push({ id, label, help: clean(q.help), type, options, required: !!q.required, show_if: q.show_if?.question && q.show_if.equals ? q.show_if : null })
  }
  // podmienka len na predchádzajúcu otázku s výberom
  return out.map((q, i) => {
    if (!q.show_if) return q
    const target = out.slice(0, i).find((x) => x.id === q.show_if!.question && x.type === 'choice' && x.options.includes(q.show_if!.equals))
    return target ? q : { ...q, show_if: null }
  })
}

const toAnswers = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {}
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === 'string') out[k] = x
  return out
}

// ------------------------------------------------------------ admin

export async function listEventsAdmin(db: SupabaseClient): Promise<AdminEventSummary[]> {
  const [{ data: events }, { data: inv }, { data: resp }] = await Promise.all([
    db.from('diocese_rsvp_events').select('id, title, slug, event_when, status, created_at').order('created_at', { ascending: false }),
    db.from('diocese_rsvp_invites').select('event_id'),
    db.from('diocese_rsvp_responses').select('event_id'),
  ])
  const count = (rows: { event_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.event_id === id).length
  return (events ?? []).map((e) => ({ id: e.id, title: e.title, slug: e.slug, event_when: e.event_when, status: e.status as EventStatus, invites: count(inv, e.id), responses: count(resp, e.id) }))
}

export async function loadEventAdmin(db: SupabaseClient, id: string): Promise<EventAdminData | null> {
  const { data: e } = await db.from('diocese_rsvp_events').select(EVENT_COLUMNS).eq('id', id).maybeSingle()
  if (!e) return null
  const [{ data: inv }, { data: resp }] = await Promise.all([
    db.from('diocese_rsvp_invites').select(INVITE_COLUMNS).eq('event_id', id).order('last_name').order('first_name'),
    db.from('diocese_rsvp_responses').select(RESPONSE_COLUMNS).eq('event_id', id).order('last_name').order('first_name'),
  ])
  return {
    event: { ...e, questions: (e.questions ?? []) as EventQuestion[], status: e.status as EventStatus, public_url: e.public_token ? rsvpUrl(e.slug, e.public_token) : null },
    invites: (inv ?? []).map((i) => ({ ...i, source: i.source as 'invite' | 'public', url: rsvpUrl(e.slug, i.token) })),
    responses: (resp ?? []).map((r) => ({ ...r, answers: toAnswers(r.answers) })),
  }
}

export async function writeEvent(db: SupabaseClient, id: string | null, input: EventInput): Promise<Result<{ id: string }>> {
  const title = input.title.trim()
  if (!title) return { success: false, error: 'Zadajte názov podujatia.' }
  const slug = generateSlug(input.slug.trim() || title)
  if (!slug) return { success: false, error: 'Neplatná adresa (slug).' }
  const { data: clash } = await db.from('diocese_rsvp_events').select('id').eq('slug', slug).maybeSingle()
  if (clash && clash.id !== id) return { success: false, error: 'Podujatie s touto adresou už existuje.' }
  const questions = normalizeQuestions(input.questions)
  const row = {
    title,
    slug,
    event_when: clean(input.event_when),
    intro: clean(input.intro),
    thanks_text: clean(input.thanks_text),
    closes_at: clean(input.closes_at),
    status: input.status,
    questions,
    updated_at: new Date().toISOString(),
  }
  if (id) {
    const { error } = await db.from('diocese_rsvp_events').update(row).eq('id', id)
    return error ? { success: false, error: 'Uloženie zlyhalo.' } : { success: true, id }
  }
  const { data, error } = await db.from('diocese_rsvp_events').insert(row).select('id').single()
  return error || !data ? { success: false, error: 'Uloženie zlyhalo.' } : { success: true, id: data.id }
}

export async function deleteEvent(db: SupabaseClient, id: string): Promise<Result> {
  const { error } = await db.from('diocese_rsvp_events').delete().eq('id', id)
  return error ? { success: false, error: 'Zmazanie zlyhalo.' } : { success: true }
}

/** Zapne (vytvorí nový) alebo vypne spoločný odkaz pre pozvánky poštou. */
export async function setPublicLink(db: SupabaseClient, eventId: string, enabled: boolean): Promise<Result> {
  const { error } = await db.from('diocese_rsvp_events').update({ public_token: enabled ? newPublicToken() : null, updated_at: new Date().toISOString() }).eq('id', eventId)
  return error ? { success: false, error: 'Uloženie zlyhalo.' } : { success: true }
}

function cleanInvite(i: InviteInput): InviteInput | string {
  const last = (i.last_name ?? '').trim()
  if (!last) return 'Chýba priezvisko.'
  const email = clean(i.email)?.toLowerCase() ?? null
  if (email && !EMAIL_RE.test(email)) return `Neplatný e-mail: ${email}`
  return { salutation: clean(i.salutation), first_name: clean(i.first_name), last_name: last, email, group_name: clean(i.group_name), note: clean(i.note) }
}

/** Pridá pozvaných (ručne alebo vložením z Excelu); rovnaký e-mail sa nepridá dvakrát. */
export async function addInvites(db: SupabaseClient, eventId: string, list: InviteInput[]): Promise<Result<{ added: number; skipped: number }>> {
  const rows: InviteInput[] = []
  for (const i of list) {
    const c = cleanInvite(i)
    if (typeof c === 'string') return { success: false, error: c }
    rows.push(c)
  }
  const { data: existing } = await db.from('diocese_rsvp_invites').select('email').eq('event_id', eventId).not('email', 'is', null)
  const seen = new Set((existing ?? []).map((e) => (e.email as string).toLowerCase()))
  const fresh = rows.filter((r) => {
    if (!r.email) return true
    if (seen.has(r.email)) return false
    seen.add(r.email)
    return true
  })
  if (fresh.length) {
    const { error } = await db.from('diocese_rsvp_invites').insert(fresh.map((r) => ({ ...r, event_id: eventId, token: newToken() })))
    if (error) return { success: false, error: 'Pridanie zlyhalo.' }
  }
  return { success: true, added: fresh.length, skipped: rows.length - fresh.length }
}

export async function updateInvite(db: SupabaseClient, inviteId: string, input: InviteInput): Promise<Result> {
  const c = cleanInvite(input)
  if (typeof c === 'string') return { success: false, error: c }
  const { error } = await db.from('diocese_rsvp_invites').update(c).eq('id', inviteId)
  return error ? { success: false, error: 'Uloženie zlyhalo.' } : { success: true }
}

export async function deleteInvite(db: SupabaseClient, inviteId: string): Promise<Result> {
  const { error } = await db.from('diocese_rsvp_invites').delete().eq('id', inviteId)
  return error ? { success: false, error: 'Zmazanie zlyhalo.' } : { success: true }
}

/** Rozošle pozvánky (e-mail event_invite) vybraným pozvaným s e-mailom. */
export async function sendInvites(db: SupabaseClient, eventId: string, inviteIds: string[]): Promise<Result<{ sent: number; failed: number; withoutEmail: number }>> {
  const { data: e } = await db.from('diocese_rsvp_events').select('slug, title, event_when, status').eq('id', eventId).maybeSingle()
  if (!e) return { success: false, error: 'Podujatie sa nenašlo.' }
  if (e.status === 'closed') return { success: false, error: 'Podujatie je uzavreté – pozvánky sa už neposielajú.' }
  const { data: invites } = await db.from('diocese_rsvp_invites').select(INVITE_COLUMNS).eq('event_id', eventId).in('id', inviteIds)
  let sent = 0
  let failed = 0
  const list = invites ?? []
  const withEmail = list.filter((i) => i.email)
  for (let k = 0; k < withEmail.length; k += 5) {
    await Promise.all(
      withEmail.slice(k, k + 5).map(async (i) => {
        const res = await sendTemplateEmail({
          templateKey: 'event_invite',
          to: i.email!,
          toName: [i.first_name, i.last_name].filter(Boolean).join(' '),
          variables: { salutation: i.salutation ?? '', first_name: i.first_name ?? '', last_name: i.last_name, event_title: e.title, event_when: e.event_when ?? '', rsvp_url: rsvpUrl(e.slug, i.token) },
        })
        if (!res.success) return void failed++
        sent++
        await db.from('diocese_rsvp_invites').update({ sent_at: new Date().toISOString(), send_count: (i.send_count ?? 0) + 1 }).eq('id', i.id)
      })
    )
  }
  return { success: true, sent, failed, withoutEmail: list.length - withEmail.length }
}

export async function deleteResponse(db: SupabaseClient, responseId: string): Promise<Result> {
  const { error } = await db.from('diocese_rsvp_responses').delete().eq('id', responseId)
  return error ? { success: false, error: 'Zmazanie zlyhalo.' } : { success: true }
}

/** Prehľad odpovedí na otázky s výberom: {question_id: {možnosť: počet}} (len zobrazené otázky). */
export function choiceTotals(questions: EventQuestion[], responses: { answers: Record<string, string> }[]) {
  const out: Record<string, Record<string, number>> = {}
  for (const q of questions.filter((x) => x.type === 'choice')) {
    out[q.id] = Object.fromEntries(q.options.map((o) => [o, 0]))
    for (const r of responses) {
      const a = r.answers[q.id]
      if (a && a in out[q.id] && visibleQuestions(questions, r.answers).some((v) => v.id === q.id)) out[q.id][a]++
    }
  }
  return out
}

export async function exportResponsesXlsx(db: SupabaseClient, eventId: string): Promise<Result<{ fileName: string; base64: string }>> {
  const data = await loadEventAdmin(db, eventId)
  if (!data) return { success: false, error: 'Podujatie sa nenašlo.' }
  const { event, invites, responses } = data
  const inviteById = new Map(invites.map((i) => [i.id, i]))
  const wb = new ExcelJS.Workbook()
  const date = new Date().toISOString().slice(0, 10)

  const ws = wb.addWorksheet('Prihlášky', { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  ws.columns = [
    { header: 'Priezvisko', key: 'last', width: 18 },
    { header: 'Meno', key: 'first', width: 14 },
    { header: 'E-mail', key: 'email', width: 28 },
    { header: 'Skupina', key: 'group', width: 14 },
    ...event.questions.map((q) => ({ header: q.label, key: `q_${q.id}`, width: q.type === 'choice' ? 14 : 28 })),
    { header: 'Odoslané', key: 'at', width: 17 },
  ]
  for (const r of responses) {
    const visible = new Set(visibleQuestions(event.questions, r.answers).map((q) => q.id))
    ws.addRow({
      last: r.last_name,
      first: r.first_name,
      email: r.email,
      group: (r.invite_id && inviteById.get(r.invite_id)?.group_name) || '',
      ...Object.fromEntries(event.questions.map((q) => [`q_${q.id}`, visible.has(q.id) ? r.answers[q.id] ?? '' : ''])),
      at: new Date(r.updated_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' }),
    })
  }
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { wrapText: true, vertical: 'top' }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const answered = new Set(responses.map((r) => r.invite_id).filter(Boolean))
  const ns = wb.addWorksheet('Bez odpovede')
  ns.columns = [
    { header: 'Priezvisko', key: 'last', width: 18 },
    { header: 'Meno', key: 'first', width: 14 },
    { header: 'E-mail', key: 'email', width: 28 },
    { header: 'Skupina', key: 'group', width: 14 },
    { header: 'Pozvánka odoslaná', key: 'sent', width: 18 },
    { header: 'Odkaz otvorený', key: 'opened', width: 18 },
  ]
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' }) : '')
  for (const i of invites.filter((x) => !answered.has(x.id))) {
    ns.addRow({ last: i.last_name, first: i.first_name ?? '', email: i.email ?? '', group: i.group_name ?? '', sent: fmt(i.sent_at), opened: fmt(i.opened_at) })
  }
  ns.getRow(1).font = { bold: true }

  const buf = await wb.xlsx.writeBuffer()
  return { success: true, fileName: `prihlasky-${event.slug}-${date}.xlsx`, base64: Buffer.from(buf).toString('base64') }
}

// ------------------------------------------------------------ web (prihláška)

export type RsvpState =
  | { kind: 'not_found' }
  | { kind: 'no_invite'; event: PublicEvent }
  | {
      kind: 'ok'
      /** invite = osobný odkaz; public = spoločný odkaz z poštovej pozvánky (QR) */
      mode: 'invite' | 'public'
      event: PublicEvent
      invite: { first_name: string; last_name: string; email: string }
      response: { first_name: string; last_name: string; email: string; answers: Record<string, string>; updated_at: string } | null
    }

type InviteRow = { id: string; token: string; first_name: string | null; last_name: string; email: string | null; opened_at: string | null; source: string }

async function findInvite(db: SupabaseClient, slug: string, token: string | null) {
  const { data: e } = await db.from('diocese_rsvp_events').select(EVENT_COLUMNS).eq('slug', slug).maybeSingle()
  if (!e) return null
  const event: PublicEvent & { id: string } = {
    id: e.id,
    slug: e.slug,
    title: e.title,
    event_when: e.event_when,
    intro: e.intro,
    thanks_text: e.thanks_text,
    questions: (e.questions ?? []) as EventQuestion[],
    open: isEventOpen({ status: e.status as EventStatus, closes_at: e.closes_at }),
  }
  if (!token || token.length < 8) return { event, invite: null, isPublic: false }
  if (e.public_token && token === e.public_token) return { event, invite: null, isPublic: true }
  const { data: invite } = await db.from('diocese_rsvp_invites').select(INVITE_COLUMNS).eq('event_id', e.id).eq('token', token).maybeSingle()
  return { event, invite: invite as InviteRow | null, isPublic: false }
}

/** Stav prihlášky pre osobný alebo spoločný odkaz; prvé otvorenie osobného odkazu sa zaznamená. */
export async function getRsvp(db: SupabaseClient, slug: string, token: string | null): Promise<RsvpState> {
  const found = await findInvite(db, slug, token)
  if (!found) return { kind: 'not_found' }
  const { id, ...event } = found.event
  if (found.isPublic) return { kind: 'ok', mode: 'public', event, invite: { first_name: '', last_name: '', email: '' }, response: null }
  if (!found.invite) return { kind: 'no_invite', event }
  const inv = found.invite
  if (!inv.opened_at) await db.from('diocese_rsvp_invites').update({ opened_at: new Date().toISOString() }).eq('id', inv.id)
  const { data: r } = await db.from('diocese_rsvp_responses').select(RESPONSE_COLUMNS).eq('event_id', id).eq('invite_id', inv.id).maybeSingle()
  return {
    kind: 'ok',
    mode: 'invite',
    event,
    invite: { first_name: inv.first_name ?? '', last_name: inv.last_name, email: inv.email ?? '' },
    response: r ? { first_name: r.first_name, last_name: r.last_name, email: r.email, answers: toAnswers(r.answers), updated_at: r.updated_at } : null,
  }
}

export interface RsvpInput {
  first_name: string
  last_name: string
  email: string
  answers: Record<string, string>
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Prihláška zo spoločného odkazu (QR): nájde pozvaného podľa e-mailu, alebo ho založí.
 * Existujúcu odoslanú prihlášku cez spoločný odkaz neprepíše – majiteľovi e-mailu pošle jeho osobný odkaz.
 */
async function inviteForPublic(
  db: SupabaseClient,
  event: { id: string; slug: string; title: string; event_when: string | null },
  p: { first_name: string; last_name: string; email: string }
): Promise<Result<{ invite: InviteRow }>> {
  const { data: same } = await db.from('diocese_rsvp_invites').select(INVITE_COLUMNS).eq('event_id', event.id).eq('email', p.email).limit(1).maybeSingle()
  if (same) {
    const { data: answered } = await db.from('diocese_rsvp_responses').select('id').eq('invite_id', same.id).maybeSingle()
    if (!answered) return { success: true, invite: same as InviteRow }
    await sendTemplateEmail({
      templateKey: 'event_invite',
      to: p.email,
      toName: `${p.first_name} ${p.last_name}`,
      variables: { first_name: p.first_name, last_name: p.last_name, event_title: event.title, event_when: event.event_when ?? '', rsvp_url: rsvpUrl(event.slug, same.token) },
    })
    return {
      success: false,
      error: 'Prihláška s týmto e-mailom už bola odoslaná. Na e-mail sme Vám poslali odkaz, cez ktorý ju môžete zmeniť. / A registration with this e-mail already exists – we have sent you a link to edit it.',
    }
  }
  const { data: created, error } = await db
    .from('diocese_rsvp_invites')
    .insert({ event_id: event.id, token: newToken(), first_name: p.first_name, last_name: p.last_name, email: p.email, group_name: PUBLIC_GROUP, source: 'public', opened_at: new Date().toISOString() })
    .select(INVITE_COLUMNS)
    .single()
  if (error || !created) return { success: false, error: 'Prihlášku sa nepodarilo uložiť, skúste to znova. / Saving failed, please try again.' }
  return { success: true, invite: created as InviteRow }
}

/**
 * Uloží (alebo zmení) prihlášku a pošle potvrdenie e-mailom s osobným odkazom.
 * Vráti osobný token – po prihlásení cez spoločný odkaz sa ďalšie úpravy robia už cez neho.
 */
export async function submitRsvp(db: SupabaseClient, slug: string, token: string, input: RsvpInput): Promise<Result<{ updated: boolean; emailed: boolean; token: string }>> {
  const found = await findInvite(db, slug, token)
  if (!found || (!found.invite && !found.isPublic)) return { success: false, error: 'Odkaz na prihlášku je neplatný. / Invalid invitation link.' }
  const { event } = found
  if (!event.open) return { success: false, error: 'Prihlasovanie je už uzavreté. / Registration is closed.' }

  const first = input.first_name.trim()
  const last = input.last_name.trim()
  const email = input.email.trim().toLowerCase()
  if (!first || !last) return { success: false, error: 'Vyplňte meno a priezvisko. / Please fill in your name.' }
  if (!EMAIL_RE.test(email)) return { success: false, error: 'Zadajte platný e-mail. / Please enter a valid e-mail.' }

  const raw = toAnswers(input.answers)
  const visible = visibleQuestions(event.questions, raw)
  const answers: Record<string, string> = {}
  for (const q of visible) {
    const v = (raw[q.id] ?? '').trim().slice(0, 2000)
    if (q.type === 'choice' && v && !q.options.includes(v)) return { success: false, error: `Neplatná odpoveď: ${q.label}` }
    if (q.required && !v) return { success: false, error: `Vyplňte povinnú otázku: ${q.label}` }
    if (v) answers[q.id] = v
  }

  let invite = found.invite
  if (!invite) {
    const res = await inviteForPublic(db, event, { first_name: first, last_name: last, email })
    if (!res.success) return res
    invite = res.invite
  }

  const { data: prev } = await db.from('diocese_rsvp_responses').select('id').eq('invite_id', invite.id).maybeSingle()
  const row = { event_id: event.id, invite_id: invite.id, first_name: first, last_name: last, email, answers, updated_at: new Date().toISOString() }
  const { error } = prev
    ? await db.from('diocese_rsvp_responses').update(row).eq('id', prev.id)
    : await db.from('diocese_rsvp_responses').insert(row)
  if (error) return { success: false, error: 'Prihlášku sa nepodarilo uložiť, skúste to znova. / Saving failed, please try again.' }

  const answersHtml = `<ul>${visible
    .filter((q) => answers[q.id])
    .map((q) => `<li><strong>${escapeHtml(q.label.replace(/:\s*$/, ''))}:</strong> ${escapeHtml(answers[q.id]).replace(/\n/g, '<br>')}</li>`)
    .join('')}</ul>`
  const mail = await sendTemplateEmail({
    templateKey: 'event_confirmation',
    to: email,
    toName: `${first} ${last}`,
    variables: { first_name: first, last_name: last, event_title: event.title, event_when: event.event_when ?? '', rsvp_url: rsvpUrl(event.slug, invite.token), answers_html: answersHtml },
  })
  return { success: true, updated: !!prev, emailed: mail.success, token: invite.token }
}
