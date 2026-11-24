import type { SupabaseClient, User } from '@supabase/supabase-js'
import { sendTemplateEmail } from '@/lib/email/send'
import { isWorkspaceEmail } from '@/lib/parishes/access-policy'
import { logParishChange } from '@/lib/parishes/writes'
import { siteBaseUrl } from '@/lib/site-server'

/**
 * Prístup do správy farnosti podľa schematizmu (069): kto má v registri aktuálne pôsobenie farár / administrátor
 * vo farnosti, je jej správcom; farský vikár (kaplán) editorom. Po preložení v schematizme prístup k starej
 * farnosti zanikne a k novej vznikne, kňaz dostane e-mail. Ručne pridelené prístupy (source = 'manual') sa nemenia.
 * Serverový modul (service role).
 */

/** Funkcie (clergy_assignments.role, malými písmenami) → rola v správe farnosti. */
const ADMIN_ROLES = new Set(['farár', 'farský administrátor', 'administrátor'])
const EDITOR_ROLES = new Set(['farský vikár', 'kaplán'])
const CLERGY_STATUSES = ['active', 'retired', 'studying']

export type ParishRole = 'admin' | 'editor'
export const PARISH_ROLE_LABEL: Record<ParishRole, string> = { admin: 'správca farnosti', editor: 'editor stránky farnosti' }

export function parishRoleFor(assignmentRole: string): ParishRole | null {
  const r = assignmentRole.trim().toLowerCase()
  if (ADMIN_ROLES.has(r)) return 'admin'
  if (EDITOR_ROLES.has(r)) return 'editor'
  return null
}

interface AssignmentRow {
  clergy_id: string
  role: string
  parish_id: string | null
  date_from: string | null
  date_to: string | null
  year_to: number | null
}

/** Pôsobenie už začalo a ešte neskončilo (dátum konca môže byť aj v budúcnosti – preloženie od 1. 7.). */
function isCurrent(a: AssignmentRow, today: string): boolean {
  if (a.date_from && a.date_from > today) return false
  if (a.date_to) return a.date_to >= today
  return a.year_to == null
}

interface Desired {
  parish_id: string
  role: ParishRole
  position: string
}

export interface ClergyAccessPlan {
  clergy_id: string
  name: string
  email: string | null
  add: { parish_id: string; parish: string; role: ParishRole }[]
  remove: { parish_id: string; parish: string }[]
  /** prečo sa prístup nedá prideliť (chýba e-mail @dcza.sk…) */
  problem: string | null
}

interface ClergyRow {
  id: string
  first_name: string
  last_name: string
  title_before: string | null
  status: string
  work_email: string | null
  auth_user_id: string | null
}

const today = () => new Date().toISOString().slice(0, 10)

/** Načíta, čo má byť (schematizmus) a čo je (parish_users so source = clergy) – pre vybraných kňazov alebo všetkých. */
async function loadState(db: SupabaseClient, clergyIds?: string[]) {
  let asgQ = db.from('clergy_assignments').select('clergy_id, role, parish_id, date_from, date_to, year_to').eq('kind', 'parish').not('parish_id', 'is', null)
  let rowQ = db.from('parish_users').select('parish_id, user_id, role, clergy_id').eq('source', 'clergy')
  if (clergyIds) {
    asgQ = asgQ.in('clergy_id', clergyIds)
    rowQ = rowQ.in('clergy_id', clergyIds)
  }
  const [{ data: asg }, { data: rows }] = await Promise.all([asgQ, rowQ])

  const d = today()
  const desired = new Map<string, Desired[]>()
  for (const a of (asg ?? []) as AssignmentRow[]) {
    const role = parishRoleFor(a.role)
    if (!role || !a.parish_id || !isCurrent(a, d)) continue
    const list = desired.get(a.clergy_id) ?? []
    const same = list.find((x) => x.parish_id === a.parish_id)
    // farár a zároveň vikár tej istej farnosti (chyba v dátach) → vyššia rola
    if (same) {
      if (role === 'admin') Object.assign(same, { role, position: a.role.trim() })
    } else list.push({ parish_id: a.parish_id, role, position: a.role.trim() })
    desired.set(a.clergy_id, list)
  }

  const existing = new Map<string, { parish_id: string; user_id: string; role: ParishRole }[]>()
  for (const r of (rows ?? []) as { parish_id: string; user_id: string; role: ParishRole; clergy_id: string }[]) {
    const list = existing.get(r.clergy_id) ?? []
    list.push(r)
    existing.set(r.clergy_id, list)
  }

  const ids = clergyIds ?? [...new Set([...desired.keys(), ...existing.keys()])]
  const { data: clergy } = ids.length
    ? await db.from('clergy').select('id, first_name, last_name, title_before, status, work_email, auth_user_id').in('id', ids)
    : { data: [] }
  const parishIds = new Set<string>()
  for (const l of desired.values()) l.forEach((x) => parishIds.add(x.parish_id))
  for (const l of existing.values()) l.forEach((x) => parishIds.add(x.parish_id))
  const { data: parishes } = parishIds.size ? await db.from('parishes').select('id, name, official_name').in('id', [...parishIds]) : { data: [] }
  const parishName = new Map((parishes ?? []).map((p) => [p.id as string, (p.official_name || p.name) as string]))

  return { desired, existing, clergy: (clergy ?? []) as ClergyRow[], parishName }
}

const nameOf = (c: ClergyRow) => [c.title_before, c.first_name, c.last_name].filter(Boolean).join(' ')

/** Plán zmien (náhľad pre admin) – nič nemení. */
export async function planClergyParishAccess(db: SupabaseClient, clergyIds?: string[]): Promise<ClergyAccessPlan[]> {
  const { desired, existing, clergy, parishName } = await loadState(db, clergyIds)
  const plans: ClergyAccessPlan[] = []
  for (const c of clergy) {
    const want = CLERGY_STATUSES.includes(c.status) ? (desired.get(c.id) ?? []) : []
    const have = existing.get(c.id) ?? []
    const email = c.work_email?.trim().toLowerCase() || null
    const add = want
      .filter((w) => !have.some((h) => h.parish_id === w.parish_id && h.role === w.role))
      .map((w) => ({ parish_id: w.parish_id, parish: parishName.get(w.parish_id) ?? '?', role: w.role }))
    const remove = have.filter((h) => !want.some((w) => w.parish_id === h.parish_id)).map((h) => ({ parish_id: h.parish_id, parish: parishName.get(h.parish_id) ?? '?' }))
    if (!add.length && !remove.length) continue
    const problem = add.length && !c.auth_user_id && !(email && isWorkspaceEmail(email)) ? 'chýba diecézny e-mail @dcza.sk v registri' : null
    plans.push({ clergy_id: c.id, name: nameOf(c), email, add, remove, problem })
  }
  return plans.sort((a, b) => a.name.localeCompare(b.name, 'sk'))
}

/** Účet kňaza: prepojený z registra, inak existujúci podľa diecézneho e-mailu, inak nový (Google ho pri prihlásení pripojí). */
async function ensureAccount(db: SupabaseClient, c: ClergyRow): Promise<{ user: User } | { error: string }> {
  if (c.auth_user_id) {
    const { data } = await db.auth.admin.getUserById(c.auth_user_id)
    if (data?.user) return { user: data.user }
  }
  const email = c.work_email?.trim().toLowerCase()
  if (!email || !isWorkspaceEmail(email)) return { error: 'chýba diecézny e-mail @dcza.sk v registri' }
  let user: User | null = null
  for (let page = 1; page <= 20 && !user; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    user = data.users.find((u) => u.email?.toLowerCase() === email) ?? null
    if (data.users.length < 1000) break
  }
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true })
    if (error || !data?.user) return { error: `účet sa nepodarilo založiť: ${error?.message ?? 'neznáma chyba'}` }
    user = data.user
  }
  const { data: other } = await db.from('clergy').select('id').eq('auth_user_id', user.id).neq('id', c.id).maybeSingle()
  if (other) return { error: 'e-mail už patrí inej osobe v registri' }
  // prepojenie s registrom = zároveň kňazská zóna (rovnaký účet)
  await db.from('clergy').update({ auth_user_id: user.id }).eq('id', c.id)
  return { user }
}

function salutationFor(role: ParishRole, position: string): string {
  const p = position.toLowerCase()
  if (p.includes('vikár') || p.includes('kaplán')) return 'Dôstojný pán kaplán'
  if (p.includes('administrátor')) return 'Dôstojný pán administrátor'
  return role === 'admin' ? 'Dôstojný pán farár' : 'Dôstojný pán'
}

export interface SyncResult {
  clergy_id: string
  name: string
  added: string[]
  removed: string[]
  emailSent: boolean
  error: string | null
}

/**
 * Zosúladí prístupy jedného kňaza so schematizmom a pošle mu e-mail (pridelenie / zmena).
 * Volá sa po každej zmene pôsobenia alebo stavu v admine, z denného cronu a z hromadnej synchronizácie.
 */
export async function syncClergyParishAccess(
  db: SupabaseClient,
  clergyId: string,
  opts: { sendEmail: boolean; actorId: string | null }
): Promise<SyncResult | null> {
  const { desired, existing, clergy, parishName } = await loadState(db, [clergyId])
  const c = clergy[0]
  if (!c) return null
  const want = CLERGY_STATUSES.includes(c.status) ? (desired.get(c.id) ?? []) : []
  const have = existing.get(c.id) ?? []
  const toRemove = have.filter((h) => !want.some((w) => w.parish_id === h.parish_id))
  const toAdd = want.filter((w) => !have.some((h) => h.parish_id === w.parish_id && h.role === w.role))
  if (!toRemove.length && !toAdd.length) return null

  const result: SyncResult = { clergy_id: c.id, name: nameOf(c), added: [], removed: [], emailSent: false, error: null }
  const now = new Date().toISOString()

  for (const r of toRemove) {
    await db.from('parish_users').delete().eq('parish_id', r.parish_id).eq('user_id', r.user_id).eq('source', 'clergy')
    await logParishChange(db, r.parish_id, opts.actorId, 'access', 'clergy_sync', { revoked: [`${result.name} (schematizmus)`, null] })
    result.removed.push(parishName.get(r.parish_id) ?? '?')
  }

  let user: User | null = null
  const addedRoles: ParishRole[] = []
  if (toAdd.length) {
    const acc = await ensureAccount(db, c)
    if ('error' in acc) result.error = acc.error
    else {
      user = acc.user
      for (const w of toAdd) {
        let role = w.role
        if (role === 'admin') {
          // správca je pre farnosť jeden: ručný správca (napr. farská schránka) ustúpi na editora;
          // iný kňaz-správca zo schematizmu ostáva (dvaja farári = chyba v dátach) a tento bude editor
          const { data: cur } = await db.from('parish_users').select('user_id, source').eq('parish_id', w.parish_id).eq('role', 'admin').neq('user_id', user.id).maybeSingle()
          if (cur?.source === 'clergy') role = 'editor'
          else if (cur) await db.from('parish_users').update({ role: 'editor' }).eq('parish_id', w.parish_id).eq('user_id', cur.user_id)
        }
        const { error } = await db.from('parish_users').upsert(
          { parish_id: w.parish_id, user_id: user.id, role, position: w.position, source: 'clergy', clergy_id: c.id, invited_by: opts.actorId, invited_at: now },
          { onConflict: 'parish_id,user_id' }
        )
        if (error) {
          result.error = `zápis prístupu zlyhal: ${error.message}`
          continue
        }
        await logParishChange(db, w.parish_id, opts.actorId, 'access', 'clergy_sync', { granted: [null, `${result.name} – ${w.position} (${role})`] })
        result.added.push(parishName.get(w.parish_id) ?? '?')
        addedRoles.push(role)
      }
    }
  }

  const email = user?.email ?? c.work_email?.trim().toLowerCase() ?? null
  if (opts.sendEmail && email && (result.added.length || result.removed.length)) {
    const position = toAdd[0]?.position ?? 'farár'
    const role: ParishRole = addedRoles.includes('admin') ? 'admin' : 'editor'
    const loginUrl = `${siteBaseUrl('dcza')}/prihlasenie?redirect=${encodeURIComponent('/moja-farnost')}`
    const common = { salutation: salutationFor(role, position), email, login_url: loginUrl, role_label: PARISH_ROLE_LABEL[role] }
    // len nový prístup (prvé pridelenie) → „bol Vám udelený prístup“; inak (preloženie, ukončenie) → „zmena prístupu“
    const res =
      result.added.length && !result.removed.length && !have.length
        ? await sendTemplateEmail({ templateKey: 'parish_access_clergy_granted', to: email, variables: { ...common, parishes: result.added.join(', ') } })
        : await sendTemplateEmail({
            templateKey: 'parish_access_clergy_changed',
            to: email,
            variables: { ...common, parishes_added: result.added.join(', '), parishes_removed: result.removed.join(', ') },
          })
    result.emailSent = res.success
    if (!res.success) result.error = [result.error, `e-mail neodišiel: ${res.error}`].filter(Boolean).join('; ')
  }
  return result
}

/**
 * Všetci kňazi so zmenou (denný cron). Kým admin nespustí prvé zosúladenie (/admin/farnosti), cron nerobí nič –
 * inak by po nasadení v noci rozposlal e-maily všetkým kňazom naraz.
 */
export async function syncAllClergyParishAccess(db: SupabaseClient, opts: { sendEmail: boolean; actorId: string | null }): Promise<SyncResult[]> {
  const { count } = await db.from('parish_users').select('parish_id', { count: 'exact', head: true }).eq('source', 'clergy')
  if (!count) return []
  const plans = await planClergyParishAccess(db)
  const results: SyncResult[] = []
  for (const p of plans) {
    const r = await syncClergyParishAccess(db, p.clergy_id, opts)
    if (r) results.push(r)
  }
  return results
}
