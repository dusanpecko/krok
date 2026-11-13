import type { SupabaseClient } from '@supabase/supabase-js'
import { clergyDisplayName, isCurrent } from '@/lib/clergy/types'
import { personName, slugify } from './bodies'

/**
 * Kontakty webu dcza.sk (065) – stránka /kontakty.
 * Sekcia → blok (oddelenie / funkcia / hodiny) → osoby. Osoba je zadaná ručne, ako kňaz z registra
 * alebo ako funkcia v kúrii (aktuálny držiteľ podľa registra – pri zmene sa kontakty upravia samy).
 * Serverový modul (service role), logika aj pre budúce API.
 */

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

export type ContactSource = 'manual' | 'clergy' | 'function'

export const CONTACT_SOURCE_LABEL: Record<ContactSource, string> = {
  function: 'Funkcia v kúrii',
  clergy: 'Kňaz z registra',
  manual: 'Ručne',
}

export interface ContactPersonInput {
  source: ContactSource
  name: string | null
  clergy_id: string | null
  body_id: string | null
  body_role_match: string | null
  role: string | null
  emails: string[]
  phones: string[]
}

export interface ContactBlockInput {
  title: string | null
  emails: string[]
  phones: string[]
  body: string | null
  people: ContactPersonInput[]
}

export interface ContactSectionInput {
  title: string
  published: boolean
  blocks: ContactBlockInput[]
}

export interface AdminContactSection extends ContactSectionInput {
  id: string
  slug: string
  sort_order: number
}

export interface ContactsAdminData {
  sections: AdminContactSection[]
  clergyOptions: { id: string; label: string }[]
  bodyOptions: { id: string; label: string; roles: string[] }[]
  /** náhľad: kto je teraz vo funkcii (kľúč body_id|match) */
  holders: Record<string, string[]>
  log: { section_title: string; action: string; created_at: string; user: string | null }[]
}

// ------------------------------------------------------------ spoločné

const SECTION_COLUMNS = 'id, slug, title, sort_order, published'
const BLOCK_COLUMNS = 'id, section_id, title, emails, phones, body, sort_order'
const PERSON_COLUMNS = 'id, block_id, source, name, clergy_id, body_id, body_role_match, role, emails, phones, sort_order'
const PUBLIC_CLERGY_STATUSES = ['active', 'retired', 'studying']

type ClergyRow = { id: string; first_name: string; last_name: string; title_before: string | null; title_after: string | null; salutation: string | null; status: string; slug: string | null; schematizmus_slug: string | null }

/** Meno na kontaktoch: tituly + meno; oslovenie len „Mons.“ (biskup, monsignori). */
const contactName = (c: ClergyRow) => [c.salutation === 'Mons.' ? 'Mons.' : null, clergyDisplayName(c)].filter(Boolean).join(' ')

export const holderKey = (bodyId: string, match: string | null) => `${bodyId}|${(match ?? '').trim().toLowerCase()}`

const matchesRole = (role: string | null | undefined, match: string | null) => {
  const m = (match ?? '').trim().toLowerCase()
  return !m || (role ?? '').trim().toLowerCase().startsWith(m)
}

interface Holder {
  name: string
  profileSlug: string | null
}

/** Aktuálni držitelia funkcií v orgánoch (kňazi z registra + ostatní členovia orgánu). */
async function loadHolders(db: SupabaseClient, wanted: { body_id: string; body_role_match: string | null }[]): Promise<Map<string, Holder[]>> {
  const bodyIds = [...new Set(wanted.map((w) => w.body_id))]
  const map = new Map<string, Holder[]>()
  if (!bodyIds.length) return map
  const [{ data: asg }, { data: members }] = await Promise.all([
    db
      .from('clergy_assignments')
      .select('body_id, body_role, role, date_to, year_to, is_primary, clergy(id, first_name, last_name, title_before, title_after, salutation, status, slug, schematizmus_slug)')
      .in('body_id', bodyIds),
    db.from('diocese_body_members').select('body_id, title_before, first_name, last_name, title_after, body_role, date_to').in('body_id', bodyIds).is('date_to', null),
  ])
  for (const w of wanted) {
    const key = holderKey(w.body_id, w.body_role_match)
    if (map.has(key)) continue
    const fromClergy = (asg ?? [])
      .filter((a) => a.body_id === w.body_id && isCurrent(a) && matchesRole(a.body_role ?? a.role, w.body_role_match))
      .map((a) => a.clergy as unknown as ClergyRow | null)
      .filter((c): c is ClergyRow => !!c && c.status !== 'deceased' && c.status !== 'left')
      .map((c) => ({ name: contactName(c), profileSlug: PUBLIC_CLERGY_STATUSES.includes(c.status) ? c.slug || c.schematizmus_slug : null }))
    const fromMembers = (members ?? [])
      .filter((m) => m.body_id === w.body_id && matchesRole(m.body_role, w.body_role_match))
      .map((m) => ({ name: personName(m), profileSlug: null }))
    map.set(key, [...fromClergy, ...fromMembers])
  }
  return map
}

async function loadAll(db: SupabaseClient, publishedOnly: boolean) {
  let q = db.from('diocese_contact_sections').select(SECTION_COLUMNS).order('sort_order').order('title')
  if (publishedOnly) q = q.eq('published', true)
  const { data: sections } = await q
  const ids = (sections ?? []).map((s) => s.id)
  if (!ids.length) return { sections: [], blocks: [], people: [] }
  const { data: blocks } = await db.from('diocese_contact_blocks').select(BLOCK_COLUMNS).in('section_id', ids).order('sort_order')
  const blockIds = (blocks ?? []).map((b) => b.id)
  const { data: people } = blockIds.length
    ? await db.from('diocese_contact_people').select(PERSON_COLUMNS).in('block_id', blockIds).order('sort_order')
    : { data: [] }
  return { sections: sections ?? [], blocks: blocks ?? [], people: people ?? [] }
}

// ------------------------------------------------------------ web

export interface PublicContactPerson {
  name: string
  profileSlug: string | null
  role: string | null
  emails: string[]
  phones: string[]
}

export interface PublicContactBlock {
  title: string | null
  emails: string[]
  phones: string[]
  body: string | null
  people: PublicContactPerson[]
}

export interface PublicContactSection {
  slug: string
  title: string
  blocks: PublicContactBlock[]
}

export async function getPublicContacts(db: SupabaseClient): Promise<PublicContactSection[]> {
  const { sections, blocks, people } = await loadAll(db, true)
  if (!sections.length) return []
  const clergyIds = [...new Set(people.filter((p) => p.source === 'clergy' && p.clergy_id).map((p) => p.clergy_id as string))]
  const [holders, { data: clergy }] = await Promise.all([
    loadHolders(db, people.filter((p) => p.source === 'function' && p.body_id).map((p) => ({ body_id: p.body_id as string, body_role_match: p.body_role_match }))),
    clergyIds.length
      ? db.from('clergy').select('id, first_name, last_name, title_before, title_after, salutation, status, slug, schematizmus_slug').in('id', clergyIds)
      : Promise.resolve({ data: [] as ClergyRow[] }),
  ])
  const clergyById = new Map(((clergy ?? []) as ClergyRow[]).map((c) => [c.id, c]))

  const resolve = (p: (typeof people)[number]): PublicContactPerson[] => {
    const extra = { role: p.role, emails: p.emails ?? [], phones: p.phones ?? [] }
    if (p.source === 'manual') return p.name ? [{ name: p.name, profileSlug: null, ...extra }] : []
    if (p.source === 'clergy') {
      const c = p.clergy_id ? clergyById.get(p.clergy_id) : null
      if (!c || c.status === 'deceased' || c.status === 'left') return []
      return [{ name: contactName(c), profileSlug: PUBLIC_CLERGY_STATUSES.includes(c.status) ? c.slug || c.schematizmus_slug : null, ...extra }]
    }
    return (holders.get(holderKey(p.body_id as string, p.body_role_match)) ?? []).map((h) => ({ ...h, ...extra }))
  }

  return sections.map((s) => ({
    slug: s.slug,
    title: s.title,
    blocks: blocks
      .filter((b) => b.section_id === s.id)
      .map((b) => ({
        title: b.title,
        emails: b.emails ?? [],
        phones: b.phones ?? [],
        body: b.body,
        people: people.filter((p) => p.block_id === b.id).flatMap(resolve),
      }))
      .filter((b) => b.title || b.body || b.emails.length || b.phones.length || b.people.length),
  }))
}

// ------------------------------------------------------------ admin

export async function loadContactsAdmin(db: SupabaseClient): Promise<ContactsAdminData> {
  const [{ sections, blocks, people }, { data: clergy }, { data: bodies }, { data: roles }, { data: memberRoles }, { data: log }] = await Promise.all([
    loadAll(db, false),
    db.from('clergy').select('id, first_name, last_name, title_before, title_after, status').in('category', ['bishop', 'priest', 'deacon', 'permanent_deacon']).not('status', 'in', '(deceased,left)').order('last_name').order('first_name'),
    db.from('diocese_bodies').select('id, name, kind, sort_order').order('kind').order('sort_order'),
    db.from('clergy_assignments').select('body_id, body_role, date_to, year_to').not('body_id', 'is', null),
    db.from('diocese_body_members').select('body_id, body_role, date_to').is('date_to', null),
    db.from('diocese_contact_log').select('section_title, action, created_at, user_id').order('created_at', { ascending: false }).limit(20),
  ])
  const holders = await loadHolders(db, people.filter((p) => p.source === 'function' && p.body_id).map((p) => ({ body_id: p.body_id as string, body_role_match: p.body_role_match })))

  // e-maily autorov zmien (auth – ako história zmien farnosti)
  const userIds = [...new Set((log ?? []).map((l) => l.user_id).filter(Boolean))] as string[]
  const emailOf = new Map<string, string>()
  for (const uid of userIds) {
    const { data } = await db.auth.admin.getUserById(uid)
    if (data?.user?.email) emailOf.set(uid, data.user.email)
  }

  const kindRank: Record<string, number> = { kuria: 0, rada: 1, usek: 2 }
  return {
    sections: sections.map((s) => ({
      ...s,
      blocks: blocks
        .filter((b) => b.section_id === s.id)
        .map((b) => ({
          title: b.title,
          emails: b.emails ?? [],
          phones: b.phones ?? [],
          body: b.body,
          people: people
            .filter((p) => p.block_id === b.id)
            .map(({ source, name, clergy_id, body_id, body_role_match, role, emails, phones }) => ({ source: source as ContactSource, name, clergy_id, body_id, body_role_match, role, emails: emails ?? [], phones: phones ?? [] })),
        })),
    })),
    clergyOptions: (clergy ?? []).map((c) => ({ id: c.id, label: clergyDisplayName(c) })),
    bodyOptions: [...(bodies ?? [])]
      .sort((a, b) => (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9) || a.sort_order - b.sort_order)
      .map((b) => ({
        id: b.id,
        label: b.name,
        roles: [
          ...new Set([
            ...(roles ?? []).filter((r) => r.body_id === b.id && isCurrent(r) && r.body_role).map((r) => r.body_role as string),
            ...(memberRoles ?? []).filter((r) => r.body_id === b.id && r.body_role).map((r) => r.body_role as string),
          ]),
        ].sort((x, y) => x.localeCompare(y, 'sk')),
      })),
    holders: Object.fromEntries([...holders].map(([k, v]) => [k, v.map((h) => h.name)])),
    log: (log ?? []).map((l) => ({ section_title: l.section_title, action: l.action, created_at: l.created_at, user: l.user_id ? emailOf.get(l.user_id) ?? null : null })),
  }
}

const cleanList = (list: string[]) => [...new Set(list.map((x) => x.trim()).filter(Boolean))]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function logChange(db: SupabaseClient, sectionId: string | null, title: string, userId: string | null, action: string) {
  await db.from('diocese_contact_log').insert({ section_id: sectionId, section_title: title, user_id: userId, action })
}

/** Uloží sekciu aj s blokmi a osobami (bloky sa nahradia celé v poradí z formulára). */
export async function writeContactSection(db: SupabaseClient, id: string | null, input: ContactSectionInput, userId: string | null): Promise<Result<{ id: string }>> {
  const title = input.title.trim()
  if (!title) return { success: false, error: 'Zadajte názov sekcie.' }

  const blocks = input.blocks.map((b) => ({
    title: b.title?.trim() || null,
    emails: cleanList(b.emails),
    phones: cleanList(b.phones),
    body: b.body?.trim() || null,
    people: b.people
      .map((p) => ({
        source: p.source,
        name: p.name?.trim() || null,
        clergy_id: p.source === 'clergy' ? p.clergy_id || null : null,
        body_id: p.source === 'function' ? p.body_id || null : null,
        body_role_match: p.source === 'function' ? p.body_role_match?.trim() || null : null,
        role: p.role?.trim() || null,
        emails: cleanList(p.emails),
        phones: cleanList(p.phones),
      }))
      .filter((p) => (p.source === 'manual' ? p.name : p.source === 'clergy' ? p.clergy_id : p.body_id)),
  }))
  const allEmails = blocks.flatMap((b) => [...b.emails, ...b.people.flatMap((p) => p.emails)])
  const bad = allEmails.find((e) => !EMAIL_RE.test(e))
  if (bad) return { success: false, error: `Neplatný e-mail: ${bad}` }

  let sectionId = id
  const row = { title, published: input.published, updated_at: new Date().toISOString() }
  if (sectionId) {
    const { error } = await db.from('diocese_contact_sections').update(row).eq('id', sectionId)
    if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  } else {
    const base = slugify(title) || 'sekcia'
    const { data: taken } = await db.from('diocese_contact_sections').select('slug').like('slug', `${base}%`)
    const slugs = new Set((taken ?? []).map((t) => t.slug))
    let slug = base
    for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`
    const { data: last } = await db.from('diocese_contact_sections').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const { data, error } = await db.from('diocese_contact_sections').insert({ ...row, slug, sort_order: (last?.sort_order ?? 0) + 10 }).select('id').single()
    if (error || !data) return { success: false, error: 'Uloženie zlyhalo.' }
    sectionId = data.id as string
  }

  const { error: delError } = await db.from('diocese_contact_blocks').delete().eq('section_id', sectionId)
  if (delError) return { success: false, error: 'Uloženie blokov zlyhalo.' }
  for (const [i, b] of blocks.entries()) {
    const { data: block, error } = await db
      .from('diocese_contact_blocks')
      .insert({ section_id: sectionId, title: b.title, emails: b.emails, phones: b.phones, body: b.body, sort_order: i + 1 })
      .select('id')
      .single()
    if (error || !block) return { success: false, error: 'Uloženie blokov zlyhalo.' }
    if (b.people.length) {
      const { error: pError } = await db.from('diocese_contact_people').insert(b.people.map((p, k) => ({ ...p, block_id: block.id, sort_order: k + 1 })))
      if (pError) return { success: false, error: 'Uloženie osôb zlyhalo.' }
    }
  }
  await logChange(db, sectionId, title, userId, id ? 'update' : 'create')
  return { success: true, id: sectionId }
}

export async function moveContactSection(db: SupabaseClient, id: string, dir: -1 | 1, userId: string | null): Promise<Result> {
  const { data: list } = await db.from('diocese_contact_sections').select('id, title').order('sort_order').order('title')
  const ids = (list ?? []).map((s) => s.id as string)
  const i = ids.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ids.length) return { success: true }
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  for (const [k, sectionId] of ids.entries()) await db.from('diocese_contact_sections').update({ sort_order: (k + 1) * 10 }).eq('id', sectionId)
  await logChange(db, id, list?.find((s) => s.id === id)?.title ?? '', userId, 'move')
  return { success: true }
}

export async function deleteContactSection(db: SupabaseClient, id: string, userId: string | null): Promise<Result> {
  const { data: s } = await db.from('diocese_contact_sections').select('title').eq('id', id).maybeSingle()
  const { error } = await db.from('diocese_contact_sections').delete().eq('id', id)
  if (error) return { success: false, error: 'Zmazanie zlyhalo.' }
  await logChange(db, null, s?.title ?? '', userId, 'delete')
  return { success: true }
}
