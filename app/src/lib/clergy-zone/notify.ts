import type { SupabaseClient, User } from '@supabase/supabase-js'
import { sendTemplateEmail } from '@/lib/email/send'
import { generateEmailLink } from '@/lib/auth/email-links'
import { getBaseUrl } from '@/lib/mollie/client'
import { ZONE_CATEGORIES, ZONE_STATUSES } from './access'

/** E-maily kňazskej zóny: pozvánka z registra (O68) a oznámenie o novom dokumente (O40, O69). Serverový modul. */

export interface ZoneMember {
  clergy_id: string
  name: string
  category: string
  status: string
  email: string | null
  /** odkiaľ je e-mail: účet, pracovný, súkromný */
  email_source: 'account' | 'work' | 'private' | null
  auth_user_id: string | null
  account_active: boolean
  invited_at: string | null
}

/** Kňazi a diakoni, ktorí patria do zóny, s e-mailom a stavom účtu. */
export async function listZoneMembers(db: SupabaseClient): Promise<ZoneMember[]> {
  const { data } = await db
    .from('clergy')
    .select('id, first_name, last_name, title_before, category, status, work_email, private_email, auth_user_id, zone_invited_at')
    .in('category', ZONE_CATEGORIES as unknown as string[])
    .in('status', ZONE_STATUSES as unknown as string[])
    .order('last_name')
    .order('first_name')
  const rows = data ?? []
  // e-maily a aktivita účtov (auth) – len pre tých, čo účet majú
  const accounts = new Map<string, User>()
  if (rows.some((r) => r.auth_user_id)) {
    for (let page = 1; page <= 50; page++) {
      const { data: list, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) break
      for (const u of list.users) accounts.set(u.id, u)
      if (list.users.length < 1000) break
    }
  }
  return rows.map((r) => {
    const acc = r.auth_user_id ? accounts.get(r.auth_user_id) : undefined
    const email = acc?.email ?? r.work_email ?? r.private_email ?? null
    return {
      clergy_id: r.id,
      name: [r.title_before, r.first_name, r.last_name].filter(Boolean).join(' '),
      category: r.category,
      status: r.status,
      email: email?.trim().toLowerCase() || null,
      email_source: acc?.email ? 'account' : r.work_email ? 'work' : r.private_email ? 'private' : null,
      auth_user_id: r.auth_user_id,
      account_active: !!acc?.last_sign_in_at,
      invited_at: r.zone_invited_at,
    }
  })
}

export function defaultClergySalutation(category: string): string {
  if (category === 'bishop') return 'Najdôstojnejší otec biskup'
  if (category === 'deacon' || category === 'permanent_deacon') return 'Vážený pán diakon'
  return 'Dôstojný pán'
}

async function findAuthUserByEmail(db: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const u = data.users.find((x) => x.email?.toLowerCase() === email)
    if (u) return u
    if (data.users.length < 200) return null
  }
  return null
}

const ZONE_NEXT = '/nastavit-heslo?next=/knazska-zona'

/**
 * Pozve kňaza do zóny: bez účtu → založí sa (bez e-mailu od Supabase) a príde naša pozvánka
 * s nastavením hesla; existujúci účet (napr. účet farnosti) sa len prepojí a príde oznámenie.
 */
export async function inviteClergyToZone(
  db: SupabaseClient,
  clergyId: string,
  opts: { email?: string | null; salutation?: string | null } = {}
): Promise<{ success: true; invited: boolean } | { success: false; error: string }> {
  const { data: c } = await db.from('clergy').select('id, category, status, work_email, private_email, auth_user_id').eq('id', clergyId).maybeSingle()
  if (!c) return { success: false, error: 'Osoba sa nenašla v registri.' }
  if (!(ZONE_CATEGORIES as readonly string[]).includes(c.category) || !(ZONE_STATUSES as readonly string[]).includes(c.status)) {
    return { success: false, error: 'Do kňazskej zóny patria len kňazi a diakoni v službe, na odpočinku alebo na štúdiu.' }
  }

  let user: User | null = null
  if (c.auth_user_id) {
    const { data } = await db.auth.admin.getUserById(c.auth_user_id)
    user = data?.user ?? null
  }
  const email = (opts.email?.trim() || user?.email || c.work_email || c.private_email || '').toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Chýba e-mail – doplňte pracovný e-mail v registri alebo ho zadajte.' }

  if (!user || user.email?.toLowerCase() !== email) user = await findAuthUserByEmail(db, email)
  let invited = false
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: false })
    if (error || !data?.user) return { success: false, error: `Účet sa nepodarilo založiť: ${error?.message ?? 'neznáma chyba'}` }
    user = data.user
    invited = true
  }
  // jeden účet = jedna osoba v registri
  const { data: other } = await db.from('clergy').select('id').eq('auth_user_id', user.id).neq('id', clergyId).maybeSingle()
  if (other) return { success: false, error: 'Tento e-mail už patrí inej osobe v registri.' }
  await db.from('clergy').update({ auth_user_id: user.id, zone_invited_at: new Date().toISOString() }).eq('id', clergyId)

  const salutation = opts.salutation?.trim() || defaultClergySalutation(c.category)
  if (user.last_sign_in_at) {
    const res = await sendTemplateEmail({
      templateKey: 'clergy_zone_granted',
      to: email,
      variables: { salutation, email, login_url: `${getBaseUrl()}/prihlasenie?redirect=${encodeURIComponent('/knazska-zona')}` },
    })
    return res.success ? { success: true, invited: false } : { success: false, error: `E-mail sa nepodarilo odoslať: ${res.error}` }
  }
  const link = await generateEmailLink(email, user.email_confirmed_at ? 'magiclink' : 'invite', ZONE_NEXT)
  if (!link.success) return { success: false, error: link.error }
  const res = await sendTemplateEmail({ templateKey: 'clergy_zone_invite', to: email, variables: { salutation, email, invite_url: link.url } })
  return res.success ? { success: true, invited } : { success: false, error: `E-mail sa nepodarilo odoslať: ${res.error}` }
}

/** Oznámenie o novom dokumente všetkým kňazom a diakonom zóny, ktorí majú e-mail. */
export async function notifyNewDoc(db: SupabaseClient, docId: string): Promise<{ sent: number; failed: number; withoutEmail: number }> {
  const { data: doc } = await db.from('clergy_docs').select('id, title, doc_number, summary, clergy_doc_categories!inner(name)').eq('id', docId).maybeSingle()
  if (!doc) return { sent: 0, failed: 0, withoutEmail: 0 }
  const members = await listZoneMembers(db)
  const emails = Array.from(new Set(members.map((m) => m.email).filter((e): e is string => !!e)))
  const base = getBaseUrl()
  const category = (doc.clergy_doc_categories as unknown as { name: string }).name
  const variables = {
    category,
    title: doc.title,
    doc_number: doc.doc_number ?? '',
    summary: doc.summary ?? '',
    doc_url: `${base}/knazska-zona/dokument/${doc.id}`,
    zone_url: `${base}/knazska-zona`,
  }
  let sent = 0
  let failed = 0
  // po 5 naraz – Brevo transakčné API
  for (let i = 0; i < emails.length; i += 5) {
    const batch = await Promise.all(emails.slice(i, i + 5).map((to) => sendTemplateEmail({ templateKey: 'clergy_doc_published', to, variables })))
    for (const r of batch) {
      if (r.success) sent++
      else failed++
    }
  }
  await db.from('clergy_docs').update({ notified_at: new Date().toISOString(), notified_count: sent }).eq('id', docId)
  return { sent, failed, withoutEmail: members.filter((m) => !m.email).length }
}
