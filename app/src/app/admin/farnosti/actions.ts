'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { generateSlug } from '@/lib/slug'
import { loadParishDetail } from '@/lib/parishes/load'
import { logParishChange, writeSchedule, writeVillages } from '@/lib/parishes/writes'
import { FIELD_LABEL, PROTECTED_PARISH_FIELDS, normalizeParishValue } from '@/lib/parishes/fields'
import { getBaseUrl } from '@/lib/mollie/client'
import { generateEmailLink } from '@/lib/auth/email-links'
import { sendTemplateEmail } from '@/lib/email/send'
import {
  PARISH_EDITABLE_FIELDS,
  type ParishDetail,
  type ParishListItem,
  type Schedule,
  type VillageWithStats,
} from '@/lib/parishes/types'
import { RESERVED_SUBDOMAINS } from '@/lib/site'
import { accessEmailError, isWorkspaceEmail } from '@/lib/parishes/access-policy'

/**
 * Admin modul farností (návrh farností § 6.1, fáza F2).
 * Citlivé stĺpce parishes nie sú čitateľné cez klienta používateľa (migrácia 034) –
 * všetko ide cez service role za kontrolou oprávnenia manage_parishes.
 */

const PERM = 'manage_parishes'

function db() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

async function log(parishId: string, userId: string, entity: string, action: string, changes: Record<string, unknown>) {
  await db().from('parish_change_log').insert({ parish_id: parishId, user_id: userId, entity, action, changes })
}

const STATS_YEAR = 2021

// ------------------------------------------------------------ zoznam

export async function getParishesForAdmin(): Promise<ParishListItem[]> {
  await requirePermission(PERM)
  const admin = db()
  const year = new Date().getFullYear()

  const [{ data: parishes }, { data: deaneries }, { data: population }, { data: villages }, { data: donors }, { data: summary }] = await Promise.all([
    admin
      .from('parishes')
      .select('id, name, official_name, slug, kind, deanery_id, parish_code, city, is_active, is_demo, visible_on_web, administrator_name, ico, iban, email, updated_at'),
    admin.from('deaneries').select('id, name'),
    admin.from('v_parish_population').select('parish_id, catholics').eq('year', STATS_YEAR),
    admin.from('parish_villages').select('parish_id'),
    admin.from('donors').select('parish_id').not('parish_id', 'is', null),
    admin.from('v_parish_year_summary').select('parish_id, collected_amount, prescribed_amount').eq('year', year),
  ])

  const deaneryName = new Map((deaneries ?? []).map((d) => [d.id as string, d.name as string]))
  const catholics = new Map((population ?? []).map((p) => [p.parish_id as string, Number(p.catholics)]))
  const count = (rows: { parish_id: string | null }[] | null) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) if (r.parish_id) m.set(r.parish_id, (m.get(r.parish_id) ?? 0) + 1)
    return m
  }
  const villagesCount = count(villages as { parish_id: string }[] | null)
  const donorsCount = count(donors as { parish_id: string }[] | null)
  const collected = new Map((summary ?? []).map((s) => [s.parish_id as string, Number(s.collected_amount)]))
  const prescribed = new Map((summary ?? []).filter((s) => s.prescribed_amount != null).map((s) => [s.parish_id as string, Number(s.prescribed_amount)]))

  return (parishes ?? [])
    .map((p) => {
      const missing: string[] = []
      if (p.kind === 'parish' && !catholics.get(p.id)) missing.push('štatistika')
      if (!p.ico) missing.push('IČO')
      if (!p.iban) missing.push('IBAN')
      if (!p.email) missing.push('e-mail')
      if (!p.deanery_id && p.kind === 'parish') missing.push('dekanát')
      return {
        id: p.id,
        name: p.name,
        official_name: p.official_name,
        slug: p.slug,
        kind: p.kind,
        deanery_id: p.deanery_id,
        deanery_name: p.deanery_id ? deaneryName.get(p.deanery_id) ?? null : null,
        parish_code: p.parish_code,
        city: p.city,
        is_active: p.is_active,
        is_demo: p.is_demo ?? false,
        visible_on_web: p.visible_on_web,
        administrator_name: p.administrator_name,
        catholics: catholics.get(p.id) ?? null,
        villages_count: villagesCount.get(p.id) ?? 0,
        donors_count: donorsCount.get(p.id) ?? 0,
        collected_this_year: collected.get(p.id) ?? 0,
        prescribed_this_year: prescribed.get(p.id) ?? null,
        missing,
        updated_at: p.updated_at,
      } satisfies ParishListItem
    })
    .sort((a, b) => (a.official_name ?? a.name).localeCompare(b.official_name ?? b.name, 'sk'))
}

export async function getDeaneryOptions(): Promise<{ id: string; name: string }[]> {
  await requirePermission(PERM)
  const { data } = await db().from('deaneries').select('id, name').order('name')
  return (data ?? []) as { id: string; name: string }[]
}

// ------------------------------------------------------------ detail

export async function getParishForAdmin(id: string): Promise<ParishDetail | null> {
  await requirePermission(PERM)
  return loadParishDetail(db(), id)
}

// ------------------------------------------------------------ zápis

const trimOrNull = (v: unknown) => {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'boolean' || typeof v === 'number') return v
  const s = String(v).trim()
  return s === '' ? null : s
}

/** Uloží základné údaje; do histórie zapíše len zmenené polia (staré → nové). */
export async function updateParish(id: string, input: Partial<Record<(typeof PARISH_EDITABLE_FIELDS)[number], unknown>>): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const { data: before } = await admin.from('parishes').select('*').eq('id', id).maybeSingle()
  if (!before) return { success: false, error: 'Farnosť sa nenašla.' }

  const patch: Record<string, unknown> = {}
  for (const f of PARISH_EDITABLE_FIELDS) {
    if (!(f in input)) continue
    let v = trimOrNull(input[f])
    if (f === 'iban' && typeof v === 'string') v = v.replace(/\s+/g, '').toUpperCase()
    if ((f === 'email' || f === 'subdomain') && typeof v === 'string') v = v.toLowerCase()
    if ((f === 'latitude' || f === 'longitude') && v != null) v = Number(v)
    patch[f] = v
  }
  if (!patch.name) return { success: false, error: 'Názov je povinný.' }
  if (patch.iban && !/^SK\d{22}$/.test(String(patch.iban))) return { success: false, error: 'IBAN musí mať tvar SK + 22 číslic.' }
  if (patch.ico && !/^\d{6,8}$/.test(String(patch.ico))) return { success: false, error: 'IČO musí mať 6–8 číslic.' }
  if (patch.subdomain && (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(patch.subdomain)) || String(patch.subdomain).length > 63 || RESERVED_SUBDOMAINS.has(String(patch.subdomain))))
    return { success: false, error: 'Subdoména môže obsahovať len malé písmená bez diakritiky, číslice a pomlčky (napr. „zilina-mesto“).' }

  const changes: Record<string, [unknown, unknown]> = {}
  for (const [k, v] of Object.entries(patch)) {
    const old = (before as Record<string, unknown>)[k] ?? null
    if (String(old ?? '') !== String(v ?? '')) changes[k] = [old, v]
  }
  if (Object.keys(changes).length === 0) return { success: true }

  const { error } = await admin
    .from('parishes')
    .update({ ...patch, profile_updated_at: new Date().toISOString(), profile_updated_by: user.id })
    .eq('id', id)
  if (error) {
    if (error.message.includes('idx_parishes_subdomain')) return { success: false, error: 'Túto subdoménu už má iná farnosť.' }
    return { success: false, error: error.message.includes('parishes_slug_key') ? 'Farnosť s týmto názvom už existuje.' : 'Uloženie zlyhalo.' }
  }

  await log(id, user.id, 'parish', 'admin_update', changes)
  revalidatePath('/admin/farnosti')
  revalidatePath(`/admin/farnosti/${id}`)
  return { success: true }
}

export async function createParish(input: { name: string; kind: string; deanery_id: string | null }): Promise<Result<{ id: string }>> {
  const { user } = await requirePermission(PERM)
  const name = input.name?.trim()
  if (!name) return { success: false, error: 'Názov je povinný.' }
  const kind = ['parish', 'chaplaincy', 'other'].includes(input.kind) ? input.kind : 'parish'
  const admin = db()
  let slug = generateSlug(name.replace(/^Farnosť\s+/i, ''))
  const { data: clash } = await admin.from('parishes').select('id').eq('slug', slug).maybeSingle()
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  const { data, error } = await admin
    .from('parishes')
    // subdoména farnosti = slug (D5); duchovné správy a dlhé slugy bez subdomény
    .insert({ name, official_name: name.replace(/^Farnosť\s+/i, ''), slug, kind, deanery_id: input.deanery_id || null, subdomain: kind === 'parish' && slug.length <= 40 && !RESERVED_SUBDOMAINS.has(slug) ? slug : null })
    .select('id')
    .single()
  if (error || !data) return { success: false, error: 'Založenie farnosti zlyhalo.' }
  await log(data.id, user.id, 'parish', 'admin_update', { created: [null, name] })
  revalidatePath('/admin/farnosti')
  return { success: true, id: data.id }
}

/** Obce a štatistika (rok SODB 2021) – celý zoznam naraz; odstránené obce sa zmažú. */
export async function saveVillages(parishId: string, villages: VillageWithStats[]): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const res = await writeVillages(admin, parishId, villages)
  if (!res.success) return res
  await logParishChange(admin, parishId, user.id, 'population', 'admin_update', { villages: villages.filter((v) => v.name.trim()).map((v) => `${v.name}: ${v.catholics ?? '–'}/${v.population ?? '–'}`) })
  revalidatePath(`/admin/farnosti/${parishId}`)
  revalidatePath('/admin/farnosti')
  return { success: true }
}

/** Rozvrh bohoslužieb pre jeden režim (cez rok / letný) – položky sa prepíšu celé. */
export async function saveSchedule(parishId: string, schedule: Schedule): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const res = await writeSchedule(admin, parishId, schedule, user.id)
  if (!res.success) return res
  await logParishChange(admin, parishId, user.id, 'schedule', 'admin_update', { season: schedule.season, items: schedule.items.length, is_active: schedule.is_active })
  revalidatePath(`/admin/farnosti/${parishId}`)
  return { success: true }
}



// ------------------------------------------------------------ prístupy farnosti (§ 5.1, O7)

export interface ParishAccessRow {
  user_id: string
  email: string | null
  role: 'admin' | 'editor'
  position: string | null
  invited_at: string | null
  accepted_at: string | null
  /** účet sa už aspoň raz prihlásil (inak má zmysel poslať pozvánku znova) */
  activated: boolean
}

export async function getParishAccess(parishId: string): Promise<ParishAccessRow[]> {
  await requirePermission(PERM)
  const admin = db()
  const { data } = await admin.from('parish_users').select('user_id, role, position, invited_at, accepted_at').eq('parish_id', parishId)
  const rows: ParishAccessRow[] = []
  for (const r of data ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(r.user_id)
    rows.push({ ...r, email: u?.user?.email ?? null, activated: !!u?.user?.last_sign_in_at } as ParishAccessRow)
  }
  return rows
}

async function findAuthUserByEmail(admin: ReturnType<typeof db>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const u = data.users.find((x) => x.email?.toLowerCase() === email)
    if (u) return u
    if (data.users.length < 200) return null
  }
  return null
}

const ROLE_LABEL = { admin: 'správca účtu farnosti', editor: 'editor stránky farnosti' } as const
const ZONE_NEXT = '/nastavit-heslo?next=/moja-farnost'

/** Predvolené oslovenie z funkcie (farár → „Vážený pán farár“) */
function defaultSalutation(position: string | null | undefined): string {
  const p = position?.trim()
  return p ? `Vážený pán ${p}` : 'Dobrý deň'
}

/**
 * E-mail k prístupu (náš text zo šablón, nie Supabase): neaktivovaný účet dostane pozvánku
 * s odkazom na nastavenie hesla, aktívny účet len oznámenie s odkazom na prihlásenie.
 */
async function sendAccessEmail(
  admin: ReturnType<typeof db>,
  input: { parishId: string; email: string; role: 'admin' | 'editor'; salutation: string; activated: boolean; confirmed: boolean }
): Promise<{ sent: boolean; error?: string }> {
  const [{ data: parish }, { data: box }] = await Promise.all([
    admin.from('parishes').select('name, official_name').eq('id', input.parishId).maybeSingle(),
    admin.from('parish_box_settings').select('enabled').eq('parish_id', input.parishId).maybeSingle(),
  ])
  const common = {
    salutation: input.salutation,
    parish_name: parish?.official_name || parish?.name || 'farnosť',
    role_label: ROLE_LABEL[input.role],
    email: input.email,
    has_box: !!box?.enabled,
  }

  const loginUrl = `${getBaseUrl()}/prihlasenie?redirect=${encodeURIComponent('/moja-farnost')}`
  // diecézna adresa (Google Workspace) – vždy len odkaz na prihlásenie cez Google, bez hesla
  if (isWorkspaceEmail(input.email)) {
    const res = await sendTemplateEmail({ templateKey: 'parish_access_google', to: input.email, variables: { ...common, login_url: loginUrl } })
    return res.success ? { sent: true } : { sent: false, error: res.error }
  }

  if (input.activated) {
    const res = await sendTemplateEmail({
      templateKey: 'parish_access_granted',
      to: input.email,
      variables: { ...common, login_url: loginUrl },
    })
    return res.success ? { sent: true } : { sent: false, error: res.error }
  }

  // nepotvrdený účet → invite (Supabase ho povolí aj opakovane); potvrdený, no nikdy neprihlásený → magiclink
  const link = await generateEmailLink(input.email, input.confirmed ? 'magiclink' : 'invite', ZONE_NEXT)
  if (!link.success) return { sent: false, error: link.error }
  const res = await sendTemplateEmail({ templateKey: 'parish_access_invite', to: input.email, variables: { ...common, invite_url: link.url } })
  return res.success ? { sent: true } : { sent: false, error: res.error }
}

/**
 * Pridelí farnosti účet (diecéza). Nový účet sa založí (bez e-mailu od Supabase) a dostane našu
 * pozvánku s odkazom na nastavenie hesla; existujúci účet dostane oznámenie o prístupe.
 * Admin účet je pre farnosť práve jeden (uq_parish_admin) – predošlý sa zmení na editora.
 */
export async function grantParishAccess(
  parishId: string,
  input: { email: string; role: 'admin' | 'editor'; position?: string; salutation?: string }
): Promise<Result<{ invited: boolean; emailSent: boolean; emailError?: string }>> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const email = input.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Zadajte platný e-mail.' }
  const emailError = accessEmailError(email)
  if (emailError) return { success: false, error: emailError }
  const role = input.role === 'editor' ? 'editor' : 'admin'

  let authUser = await findAuthUserByEmail(admin, email)
  let invited = false
  if (!authUser) {
    // založí účet bez e-mailu od Supabase – pozvánku pošleme sami nižšie; adresa @dcza.sk je overená
    // Google Workspace-om (prihlásenie cez Google sa k účtu pripojí), iné adresy si e-mail potvrdia pozvánkou
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: isWorkspaceEmail(email) })
    if (error || !data?.user) return { success: false, error: `Účet sa nepodarilo založiť: ${error?.message ?? 'neznáma chyba'}` }
    authUser = data.user
    invited = true
  }

  if (role === 'admin') await admin.from('parish_users').update({ role: 'editor' }).eq('parish_id', parishId).eq('role', 'admin').neq('user_id', authUser.id)
  const { error } = await admin.from('parish_users').upsert(
    { parish_id: parishId, user_id: authUser.id, role, position: input.position?.trim() || null, invited_by: user.id, invited_at: new Date().toISOString() },
    { onConflict: 'parish_id,user_id' }
  )
  if (error) return { success: false, error: 'Pridelenie prístupu zlyhalo.' }

  const mail = await sendAccessEmail(admin, {
    parishId,
    email,
    role,
    salutation: input.salutation?.trim() || defaultSalutation(input.position),
    activated: !!authUser.last_sign_in_at,
    confirmed: !!authUser.email_confirmed_at,
  })
  await logParishChange(admin, parishId, user.id, 'access', 'admin_update', { granted: [null, `${email} (${role})`], invited, email_sent: mail.sent })
  revalidatePath(`/admin/farnosti/${parishId}`)
  return { success: true, invited, emailSent: mail.sent, emailError: mail.error }
}

/** Pošle pozvánku (neaktivovaný účet) alebo oznámenie o prístupe znova. */
export async function resendParishAccessEmail(parishId: string, userId: string, salutation?: string): Promise<Result<{ invite: boolean }>> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const { data: row } = await admin.from('parish_users').select('role, position').eq('parish_id', parishId).eq('user_id', userId).maybeSingle()
  if (!row) return { success: false, error: 'Prístup sa nenašiel.' }
  const { data: u } = await admin.auth.admin.getUserById(userId)
  const email = u?.user?.email
  if (!email) return { success: false, error: 'Účet nemá e-mail.' }

  const activated = !!u?.user?.last_sign_in_at
  const mail = await sendAccessEmail(admin, {
    parishId,
    email,
    role: row.role === 'editor' ? 'editor' : 'admin',
    salutation: salutation?.trim() || defaultSalutation(row.position),
    activated,
    confirmed: !!u?.user?.email_confirmed_at,
  })
  if (!mail.sent) return { success: false, error: `E-mail sa nepodarilo odoslať: ${mail.error ?? 'neznáma chyba'}` }
  await admin.from('parish_users').update({ invited_at: new Date().toISOString() }).eq('parish_id', parishId).eq('user_id', userId)
  await logParishChange(admin, parishId, user.id, 'access', 'admin_update', { resent: [null, email] })
  revalidatePath(`/admin/farnosti/${parishId}`)
  return { success: true, invite: !activated }
}

export async function revokeParishAccess(parishId: string, userId: string): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const { data: u } = await admin.auth.admin.getUserById(userId)
  await admin.from('parish_users').delete().eq('parish_id', parishId).eq('user_id', userId)
  await logParishChange(admin, parishId, user.id, 'access', 'admin_update', { revoked: [u?.user?.email ?? userId, null] })
  revalidatePath(`/admin/farnosti/${parishId}`)
  return { success: true }
}

// ------------------------------------------------------------ návrhy zmien od farností (§ 3.6)

export interface ChangeRequestRow {
  id: string
  parish_id: string
  parish_name: string
  entity: string
  payload: Record<string, unknown>
  /** pre entity 'parish': aktuálne hodnoty navrhovaných polí */
  current: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  submitted_by_email: string | null
  review_note: string | null
}

export async function getChangeRequests(opts: { status?: 'pending' | 'all'; parishId?: string } = {}): Promise<ChangeRequestRow[]> {
  await requirePermission(PERM)
  const admin = db()
  let q = admin.from('parish_change_requests').select('*, parishes(name, official_name)').order('submitted_at', { ascending: false }).limit(100)
  if ((opts.status ?? 'pending') === 'pending') q = q.eq('status', 'pending')
  if (opts.parishId) q = q.eq('parish_id', opts.parishId)
  const { data } = await q
  const out: ChangeRequestRow[] = []
  for (const r of (data ?? []) as (Record<string, unknown> & { parishes: { name: string; official_name: string | null } | null })[]) {
    let current: Record<string, unknown> = {}
    if (r.entity === 'parish') {
      const fields = Object.keys(r.payload as object).filter((f) => (PROTECTED_PARISH_FIELDS as readonly string[]).includes(f))
      if (fields.length) {
        const { data: p } = await admin.from('parishes').select(fields.join(',')).eq('id', r.parish_id as string).maybeSingle()
        current = (p ?? {}) as unknown as Record<string, unknown>
      }
    } else if (r.entity === 'population') {
      const { data: v } = await admin.from('parish_villages').select('name, parish_population_stats(catholics, population)').eq('parish_id', r.parish_id as string).order('sort_order')
      current = { villages: (v ?? []).map((x) => `${x.name}: ${(x.parish_population_stats as { catholics: number | null }[])?.[0]?.catholics ?? '–'}`) }
    }
    const { data: u } = r.submitted_by ? await admin.auth.admin.getUserById(r.submitted_by as string) : { data: null }
    out.push({
      id: r.id as string,
      parish_id: r.parish_id as string,
      parish_name: r.parishes?.official_name ?? r.parishes?.name ?? '',
      entity: r.entity as string,
      payload: r.payload as Record<string, unknown>,
      current,
      status: r.status as ChangeRequestRow['status'],
      submitted_at: r.submitted_at as string,
      submitted_by_email: u?.user?.email ?? null,
      review_note: (r.review_note as string | null) ?? null,
    })
  }
  return out
}

export async function countPendingChangeRequests(): Promise<number> {
  await requirePermission(PERM)
  const { count } = await db().from('parish_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  return count ?? 0
}

/** Schválenie návrhu – premietne payload do registra a zapíše audit. */
export async function approveChangeRequest(id: string): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const { data: r } = await admin.from('parish_change_requests').select('*').eq('id', id).maybeSingle()
  if (!r || r.status !== 'pending') return { success: false, error: 'Návrh sa nenašiel alebo už bol vybavený.' }

  if (r.entity === 'parish') {
    const patch: Record<string, unknown> = {}
    const changes: Record<string, [unknown, unknown]> = {}
    const fields = Object.keys(r.payload).filter((f) => (PROTECTED_PARISH_FIELDS as readonly string[]).includes(f))
    const { data: before } = await admin.from('parishes').select(fields.join(',') || 'id').eq('id', r.parish_id).maybeSingle()
    for (const f of fields) {
      const { value, error } = normalizeParishValue(f, r.payload[f])
      if (error) return { success: false, error: `${FIELD_LABEL[f] ?? f}: ${error}` }
      patch[f] = value
      changes[f] = [(before as unknown as Record<string, unknown> | null)?.[f] ?? null, value]
    }
    if (Object.keys(patch).length) {
      const { error } = await admin.from('parishes').update({ ...patch, profile_updated_at: new Date().toISOString(), profile_updated_by: user.id }).eq('id', r.parish_id)
      if (error) return { success: false, error: 'Zmenu sa nepodarilo premietnuť.' }
    }
    await logParishChange(admin, r.parish_id, user.id, 'parish', 'approve', changes)
  } else if (r.entity === 'population') {
    const res = await writeVillages(admin, r.parish_id, (r.payload.villages ?? []) as VillageWithStats[], 'návrh farnosti')
    if (!res.success) return res
    await logParishChange(admin, r.parish_id, user.id, 'population', 'approve', { request: id })
  } else {
    return { success: false, error: 'Neznámy typ návrhu.' }
  }

  await admin.from('parish_change_requests').update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/farnosti/schvalovanie')
  revalidatePath(`/admin/farnosti/${r.parish_id}`)
  return { success: true }
}

export async function rejectChangeRequest(id: string, note: string): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  if (!note?.trim()) return { success: false, error: 'Uveďte dôvod zamietnutia – farnosť ho uvidí.' }
  const { data: r } = await admin.from('parish_change_requests').select('parish_id, status, entity').eq('id', id).maybeSingle()
  if (!r || r.status !== 'pending') return { success: false, error: 'Návrh sa nenašiel alebo už bol vybavený.' }
  await admin.from('parish_change_requests').update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: note.trim() }).eq('id', id)
  await logParishChange(admin, r.parish_id, user.id, r.entity, 'reject', { request: id, note: note.trim() })
  revalidatePath('/admin/farnosti/schvalovanie')
  revalidatePath(`/admin/farnosti/${r.parish_id}`)
  return { success: true }
}
