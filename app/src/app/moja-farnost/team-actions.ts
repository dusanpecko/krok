'use server'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireParishMember } from '@/lib/parishes/access'
import { logParishChange } from '@/lib/parishes/writes'
import { isWorkspaceEmail } from '@/lib/parishes/access-policy'
import { generateEmailLink } from '@/lib/auth/email-links'
import { sendTemplateEmail } from '@/lib/email/send'
import { siteBaseUrl } from '@/lib/site-server'

/**
 * Ľudia s prístupom k farnosti (070): správca farnosti (farár / administrátor) pridá alebo odoberie editora
 * stránky farnosti – napr. ministranta. Editor od farára môže mať akúkoľvek e-mailovú adresu (rozhodnutie
 * 2026-11-24); prístup správcu a kňazov zo schematizmu sa tu meniť nedá.
 */

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

export interface ParishTeamMember {
  user_id: string
  email: string | null
  role: 'admin' | 'editor'
  /** funkcia kňaza alebo meno / poznámka k editorovi (napr. „Jakub – ministrant“) */
  position: string | null
  source: 'manual' | 'clergy'
  invited_at: string | null
  /** už sa aspoň raz prihlásil */
  activated: boolean
  /** správca farnosti ho môže odobrať (editor pridaný ručne, nie on sám) */
  removable: boolean
}

const MAX_EDITORS = 15
const ZONE_NEXT = '/nastavit-heslo?next=/moja-farnost'

/** Len správca farnosti (alebo diecéza „prihlásená za farnosť“). */
async function requireParishAdmin(parishId: string) {
  const member = await requireParishMember(parishId)
  if (member.role !== 'admin') throw new Error('Ľudí s prístupom spravuje len správca farnosti (farár / administrátor).')
  return member
}

export async function getMyParishTeam(parishId: string): Promise<ParishTeamMember[]> {
  const { user, db } = await requireParishAdmin(parishId)
  const { data } = await db.from('parish_users').select('user_id, role, position, source, invited_at').eq('parish_id', parishId)
  const rows: ParishTeamMember[] = []
  for (const r of data ?? []) {
    const { data: u } = await db.auth.admin.getUserById(r.user_id)
    rows.push({
      user_id: r.user_id,
      email: u?.user?.email ?? null,
      role: r.role,
      position: r.position,
      source: r.source === 'clergy' ? 'clergy' : 'manual',
      invited_at: r.invited_at,
      activated: !!u?.user?.last_sign_in_at,
      removable: r.role === 'editor' && r.source !== 'clergy' && r.user_id !== user.id,
    })
  }
  // správca, kňazi zo schematizmu, potom editori
  const rank = (m: ParishTeamMember) => (m.role === 'admin' ? 0 : m.source === 'clergy' ? 1 : 2)
  return rows.sort((a, b) => rank(a) - rank(b) || (a.email ?? '').localeCompare(b.email ?? ''))
}

async function findUserByEmail(db: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const u = data.users.find((x) => x.email?.toLowerCase() === email)
    if (u) return u
    if (data.users.length < 1000) return null
  }
  return null
}

/** Meno pozývajúceho do e-mailu: kňaz z registra, inak e-mail. */
async function inviterName(db: SupabaseClient, user: User): Promise<string> {
  const { data: c } = await db.from('clergy').select('title_before, first_name, last_name').eq('auth_user_id', user.id).maybeSingle()
  return c ? [c.title_before, c.first_name, c.last_name].filter(Boolean).join(' ') : (user.email ?? 'Správca farnosti')
}

async function sendEditorEmail(db: SupabaseClient, parishId: string, target: User, inviter: User, personName: string | null): Promise<{ sent: boolean; error?: string }> {
  const email = target.email!.toLowerCase()
  const { data: parish } = await db.from('parishes').select('name, official_name').eq('id', parishId).maybeSingle()
  const base = siteBaseUrl('dcza')
  let inviteUrl: string | null = null
  // nikdy neprihlásený účet mimo @dcza.sk → odkaz na aktiváciu s nastavením hesla; inak len prihlásenie
  if (!target.last_sign_in_at && !isWorkspaceEmail(email)) {
    const link = await generateEmailLink(email, target.email_confirmed_at ? 'magiclink' : 'invite', ZONE_NEXT, base)
    if (!link.success) return { sent: false, error: link.error }
    inviteUrl = link.url
  }
  const res = await sendTemplateEmail({
    templateKey: 'parish_editor_invite',
    to: email,
    variables: {
      person_name: personName,
      inviter_name: await inviterName(db, inviter),
      parish_name: parish?.official_name || parish?.name || 'farnosti',
      email,
      invite_url: inviteUrl,
      login_url: `${base}/prihlasenie?redirect=${encodeURIComponent('/moja-farnost')}`,
    },
  })
  return res.success ? { sent: true } : { sent: false, error: res.error }
}

export async function addMyParishEditor(parishId: string, input: { email: string; name?: string }): Promise<Result<{ emailSent: boolean; emailError?: string }>> {
  try {
    const { user, db } = await requireParishAdmin(parishId)
    const email = input.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Zadajte platný e-mail.' }
    const name = input.name?.trim().slice(0, 80) || null

    const { count } = await db.from('parish_users').select('user_id', { count: 'exact', head: true }).eq('parish_id', parishId).eq('role', 'editor').eq('source', 'manual')
    if ((count ?? 0) >= MAX_EDITORS) return { success: false, error: `Farnosť môže mať najviac ${MAX_EDITORS} pridaných editorov.` }

    let target = await findUserByEmail(db, email)
    if (target) {
      const { data: existing } = await db.from('parish_users').select('role').eq('parish_id', parishId).eq('user_id', target.id).maybeSingle()
      if (existing) return { success: false, error: 'Táto adresa už k farnosti prístup má.' }
    } else {
      // potvrdený hneď: bez hesla sa doň dostane len majiteľ schránky (odkaz z e-mailu / Google) a Google prihlásenie sa k nemu pripojí
      const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true })
      if (error || !data?.user) return { success: false, error: `Účet sa nepodarilo založiť: ${error?.message ?? 'neznáma chyba'}` }
      target = data.user
    }

    const { error } = await db.from('parish_users').insert({
      parish_id: parishId,
      user_id: target.id,
      role: 'editor',
      position: name,
      source: 'manual',
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    })
    if (error) return { success: false, error: 'Pridanie prístupu zlyhalo.' }
    await logParishChange(db, parishId, user.id, 'access', 'parish_update', { granted: [null, `${email}${name ? ` (${name})` : ''} – editor`] })

    const mail = await sendEditorEmail(db, parishId, target, user, name)
    revalidatePath(`/moja-farnost/${parishId}`)
    revalidatePath(`/admin/farnosti/${parishId}`)
    return { success: true, emailSent: mail.sent, emailError: mail.error }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznáma chyba.' }
  }
}

export async function resendMyParishEditorEmail(parishId: string, userId: string): Promise<Result> {
  try {
    const { user, db } = await requireParishAdmin(parishId)
    const { data: row } = await db.from('parish_users').select('role, source, position').eq('parish_id', parishId).eq('user_id', userId).maybeSingle()
    if (!row || row.role !== 'editor' || row.source === 'clergy') return { success: false, error: 'Pozvánku môžete poslať len editorovi, ktorého ste pridali.' }
    const { data: u } = await db.auth.admin.getUserById(userId)
    if (!u?.user?.email) return { success: false, error: 'Účet nemá e-mail.' }
    const mail = await sendEditorEmail(db, parishId, u.user, user, row.position)
    if (!mail.sent) return { success: false, error: `E-mail sa nepodarilo odoslať: ${mail.error ?? 'neznáma chyba'}` }
    await db.from('parish_users').update({ invited_at: new Date().toISOString() }).eq('parish_id', parishId).eq('user_id', userId)
    revalidatePath(`/moja-farnost/${parishId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznáma chyba.' }
  }
}

export async function removeMyParishEditor(parishId: string, userId: string): Promise<Result> {
  try {
    const { user, db } = await requireParishAdmin(parishId)
    if (userId === user.id) return { success: false, error: 'Sám sebe prístup odobrať nemôžete.' }
    const { data: row } = await db.from('parish_users').select('role, source').eq('parish_id', parishId).eq('user_id', userId).maybeSingle()
    if (!row) return { success: false, error: 'Prístup sa nenašiel.' }
    if (row.role !== 'editor' || row.source === 'clergy') return { success: false, error: 'Prístup kňazov podľa schematizmu upravuje biskupský úrad.' }
    const { data: u } = await db.auth.admin.getUserById(userId)
    await db.from('parish_users').delete().eq('parish_id', parishId).eq('user_id', userId)
    await logParishChange(db, parishId, user.id, 'access', 'parish_update', { revoked: [`${u?.user?.email ?? userId} – editor`, null] })
    revalidatePath(`/moja-farnost/${parishId}`)
    revalidatePath(`/admin/farnosti/${parishId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznáma chyba.' }
  }
}
