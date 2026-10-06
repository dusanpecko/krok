'use server'

import { revalidatePath } from 'next/cache'
import { requireParishMember } from '@/lib/parishes/access'
import { logParishChange, writeSocialLinks } from '@/lib/parishes/writes'
import type { SocialLink } from '@/lib/parishes/social'
import { POST_COLUMNS, loadSacramentEditRows, writeParishPost, type ParishPostInput, type ParishPostRow, type SacramentEditRow } from '@/lib/parishes/posts'
import { sanitizeRichHtml } from '@/lib/html/sanitize'
import { loadParishTraffic, type TrafficResult } from '@/lib/parishes/traffic'
import { uploadImage } from '@/lib/storage'
import { isParishTheme } from '@/components/parish-themes/meta'
import { getBoxSettings } from '@/lib/parish-box/server'
import { bratislavaMidnightIso } from '@/lib/parish-box/types'

/**
 * Web farnosti v zóne /moja-farnost (fáza F5): oznamy, aktuality, sviatosti, motív.
 * Idú na web hneď bez schvaľovania (O6, § 4.3) – kontrola je následná (diecéza vie príspevok stiahnuť).
 */

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

async function revalidateParishWeb(db: Awaited<ReturnType<typeof requireParishMember>>['db'], parishId: string) {
  const { data } = await db.from('parishes').select('slug').eq('id', parishId).maybeSingle()
  revalidatePath(`/moja-farnost/${parishId}`)
  if (data?.slug) revalidatePath(`/farnosti/${data.slug}`, 'layout')
}

export async function listMyPosts(parishId: string): Promise<ParishPostRow[]> {
  const { db } = await requireParishMember(parishId)
  const { data } = await db.from('parish_posts').select(POST_COLUMNS).eq('parish_id', parishId).order('created_at', { ascending: false }).limit(200)
  return (data ?? []) as ParishPostRow[]
}

export async function saveMyPost(parishId: string, input: ParishPostInput): Promise<Result<{ id: string; slug: string }>> {
  const { user, db } = await requireParishMember(parishId)
  const res = await writeParishPost(db, parishId, user.id, input)
  if (!res.success) return res
  await logParishChange(db, parishId, user.id, 'post', input.id ? 'parish_update' : 'post_create', {
    [input.type === 'announcement' ? 'oznam' : 'aktualita']: input.title,
    published: input.published,
  })
  await revalidateParishWeb(db, parishId)
  return res
}

export async function deleteMyPost(parishId: string, postId: string): Promise<Result> {
  const { user, db } = await requireParishMember(parishId)
  const { data } = await db.from('parish_posts').select('title').eq('id', postId).eq('parish_id', parishId).maybeSingle()
  if (!data) return { success: false, error: 'Príspevok sa nenašiel.' }
  const { error } = await db.from('parish_posts').delete().eq('id', postId)
  if (error) return { success: false, error: 'Zmazanie zlyhalo.' }
  await logParishChange(db, parishId, user.id, 'post', 'post_delete', { title: data.title })
  await revalidateParishWeb(db, parishId)
  return { success: true }
}

const MAX_UPLOAD = 15 * 1024 * 1024

/** Obrázok alebo PDF príloha (oznamy) – Backblaze B2, priečinok farnosti. */
export async function uploadMyParishFile(parishId: string, formData: FormData): Promise<{ url?: string; name?: string; error?: string }> {
  await requireParishMember(parishId)
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Žiadny súbor.' }
  if (file.size > MAX_UPLOAD) return { error: 'Súbor je väčší ako 15 MB.' }
  const isPdf = file.type === 'application/pdf'
  if (!isPdf && !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return { error: 'Povolené sú obrázky (JPG, PNG, WebP) a PDF.' }
  const res = await uploadImage(file, `parishes/${parishId}/${isPdf ? 'files' : 'images'}`)
  if (!res) return { error: 'Nahrávanie zlyhalo.' }
  return { url: res.url, name: file.name }
}

/** Upload pre editor TipTap (obrázky v texte). */
export async function uploadMyEditorImage(parishId: string, formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get('file')
  if (file instanceof File && file.type === 'application/pdf') return { error: 'Do textu vkladajte len obrázky.' }
  const res = await uploadMyParishFile(parishId, formData)
  return res.url ? { url: res.url } : { error: res.error }
}

export async function getMySacraments(parishId: string): Promise<SacramentEditRow[]> {
  const { db } = await requireParishMember(parishId)
  return loadSacramentEditRows(db, parishId)
}

/** Vlastný text sviatosti (null = späť na diecézny štandard) a skrytie sekcie (O27). */
export async function saveMySacrament(parishId: string, type: string, content: string | null, isHidden: boolean): Promise<Result> {
  const { user, db } = await requireParishMember(parishId)
  const { data: base } = await db.from('sacrament_texts').select('type, title').eq('type', type).maybeSingle()
  if (!base) return { success: false, error: 'Neznáma sviatosť.' }
  const clean = content == null ? null : sanitizeRichHtml(content) || null
  if (!clean && !isHidden) {
    await db.from('parish_sacrament_texts').delete().eq('parish_id', parishId).eq('type', type)
  } else {
    const { error } = await db
      .from('parish_sacrament_texts')
      .upsert({ parish_id: parishId, type, content: clean, is_hidden: isHidden, updated_by: user.id, updated_at: new Date().toISOString() })
    if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  }
  await logParishChange(db, parishId, user.id, 'sacrament', 'parish_update', { [base.title]: isHidden ? 'skryté' : clean ? 'vlastný text' : 'diecézny text' })
  await revalidateParishWeb(db, parishId)
  return { success: true }
}

/** Motív stránky (O29) – ponúka sa, až keď je v registri viac motívov. */
export async function setMyTheme(parishId: string, theme: string): Promise<Result> {
  const { user, db } = await requireParishMember(parishId)
  if (!isParishTheme(theme)) return { success: false, error: 'Neznámy motív.' }
  const { error } = await db.from('parishes').update({ theme }).eq('id', parishId)
  if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  await logParishChange(db, parishId, user.id, 'parish', 'parish_update', { theme })
  await revalidateParishWeb(db, parishId)
  return { success: true }
}

/**
 * Zapnutie verejnej stránky farnosti – rozhoduje správca farnosti (rola admin), diecéza to vie aj v admine.
 * Vypnutá farnosť má verejne len základnú stránku (kontakt, kňazi, podpora) bez bohoslužieb a príspevkov.
 */
export async function setMyWebVisibility(parishId: string, visible: boolean): Promise<Result> {
  const { user, db, role } = await requireParishMember(parishId)
  if (role !== 'admin') return { success: false, error: 'Stránku môže zapnúť len správca farnosti.' }
  const { error } = await db.from('parishes').update({ visible_on_web: visible }).eq('id', parishId)
  if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  await logParishChange(db, parishId, user.id, 'parish', 'parish_update', { visible_on_web: visible })
  await revalidateParishWeb(db, parishId)
  revalidatePath('/farnosti')
  return { success: true }
}

/** Sociálne siete – farnosť ich mení hneď (prezentácia). */
export async function saveMySocialLinks(parishId: string, links: SocialLink[]): Promise<Result> {
  const { user, db } = await requireParishMember(parishId)
  const res = await writeSocialLinks(db, parishId, user.id, links, 'parish_update')
  if (res.success) await revalidateParishWeb(db, parishId)
  return res
}

/** Návštevnosť stránky farnosti (Umami) – vidí ju účet farnosti. */
export async function getMyParishTraffic(parishId: string, days: number): Promise<TrafficResult> {
  const { db } = await requireParishMember(parishId)
  return loadParishTraffic(db, parishId, days)
}

// ------------------------------------------------------------
// E-zvonček (§ 12) – farnosť vidí len súhrny a výplaty, bez mien darcov (O3); zapína ho diecéza
// ------------------------------------------------------------

export interface MyParishBoxView {
  enabled: boolean
  mollie_fee_pct: number
  fund_fee_pct: number
  thisMonth: { count: number; gross: number }
  waiting: { count: number; gross: number }
  activeRecurring: number
  payouts: { id: string; period_month: string; gift_count: number; gross_amount: number; mollie_fee: number; fund_fee: number; net_amount: number; status: string; sent_at: string | null }[]
}

export async function getMyParishBox(parishId: string): Promise<Result<{ view: MyParishBoxView }>> {
  try {
    const { role, db } = await requireParishMember(parishId)
    if (role !== 'admin') return { success: false, error: 'E-zvonček vidí len správca farnosti.' }
    const settings = await getBoxSettings(parishId)
    const now = new Date()
    const monthStart = bratislavaMidnightIso(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
    const [{ data: gifts }, { data: payouts }, { count }] = await Promise.all([
      db.from('parish_box_gifts').select('amount, paid_at').eq('parish_id', parishId).is('payout_id', null),
      db.from('parish_payouts').select('id, period_month, gift_count, gross_amount, mollie_fee, fund_fee, net_amount, status, sent_at').eq('parish_id', parishId).order('period_month', { ascending: false }).limit(24),
      db.from('online_subscriptions').select('id', { count: 'exact', head: true }).eq('purpose', 'parish_box').eq('box_parish_id', parishId).in('status', ['active', 'past_due']),
    ])
    const sum = (rows: { amount: number | string }[]) => Math.round(rows.reduce((a, g) => a + Number(g.amount) * 100, 0)) / 100
    const waiting = gifts ?? []
    const thisMonth = waiting.filter((g) => new Date(g.paid_at) >= new Date(monthStart))
    return {
      success: true,
      view: {
        enabled: settings.enabled,
        mollie_fee_pct: settings.mollie_fee_pct,
        fund_fee_pct: settings.fund_fee_pct,
        thisMonth: { count: thisMonth.length, gross: sum(thisMonth) },
        waiting: { count: waiting.length, gross: sum(waiting) },
        activeRecurring: count ?? 0,
        payouts: (payouts ?? []).map((p) => ({
          ...p,
          gross_amount: Number(p.gross_amount),
          mollie_fee: Number(p.mollie_fee),
          fund_fee: Number(p.fund_fee),
          net_amount: Number(p.net_amount),
        })),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznáma chyba' }
  }
}
