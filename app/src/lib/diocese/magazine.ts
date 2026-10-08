import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadBuffer } from '@/lib/storage'

/**
 * Časopis „Naša Žilinská diecéza“ (§ 20) – čísla, obálky a synchronizácia so Zachej.sk,
 * kde sa e-časopis predáva (filter /filter/nasa-zilinska-dieceza/). Serverový modul.
 */

export interface MagazineRow {
  id: string
  title: string
  issue_number: string | null
  sort_index: number
  description: string | null
  cover_url: string | null
  pdf_url: string | null
  link_url: string | null
  published: boolean
}

export interface MagazineInput {
  issue_number: string
  title?: string | null
  description?: string | null
  cover_url?: string | null
  pdf_url?: string | null
  link_url?: string | null
  published?: boolean
}

const ZACHEJ = 'https://www.zachej.sk'
const UA = { 'User-Agent': 'Mozilla/5.0 (KROK mojkrok.sk)' }

/** „5/2026“ → { label: '05/2026', sort: 202605 } */
export function parseIssue(raw: string): { label: string; sort: number } | null {
  const m = raw.trim().match(/^(\d{1,2})\s*\/\s*(\d{4})$/)
  if (!m) return null
  const month = Number(m[1])
  const year = Number(m[2])
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null
  return { label: `${String(month).padStart(2, '0')}/${year}`, sort: year * 100 + month }
}

/** Obálka → WebP na B2 (max. 1200 px). */
export async function storeCover(buf: Buffer): Promise<string | null> {
  const webp = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  return (await uploadBuffer(webp, 'image/webp', 'dcza/casopis'))?.url ?? null
}

export async function listIssues(db: SupabaseClient): Promise<MagazineRow[]> {
  const { data } = await db.from('diocese_magazine_issues').select('id, title, issue_number, sort_index, description, cover_url, pdf_url, link_url, published').order('sort_index', { ascending: false })
  return (data ?? []) as MagazineRow[]
}

export async function saveIssue(db: SupabaseClient, id: string | null, input: MagazineInput): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const issue = parseIssue(input.issue_number ?? '')
  if (!issue) return { success: false, error: 'Číslo vydania zadajte v tvare MM/RRRR, napr. 10/2026.' }
  const https = (u?: string | null) => (u && /^https:\/\/\S+$/.test(u.trim()) ? u.trim() : null)
  if (input.link_url && !https(input.link_url)) return { success: false, error: 'Odkaz musí začínať https://' }
  const { data: dup } = await db.from('diocese_magazine_issues').select('id').eq('sort_index', issue.sort).neq('id', id ?? '00000000-0000-0000-0000-000000000000').maybeSingle()
  if (dup) return { success: false, error: `Číslo ${issue.label} už existuje.` }
  const row = {
    issue_number: issue.label,
    sort_index: issue.sort,
    title: input.title?.trim().slice(0, 200) || `Naša Žilinská diecéza ${issue.label}`,
    description: input.description?.trim().slice(0, 1000) || null,
    cover_url: https(input.cover_url),
    pdf_url: https(input.pdf_url),
    link_url: https(input.link_url),
    published: input.published !== false,
  }
  if (id) {
    const { error } = await db.from('diocese_magazine_issues').update(row).eq('id', id)
    return error ? { success: false, error: 'Uloženie zlyhalo.' } : { success: true, id }
  }
  const { data, error } = await db.from('diocese_magazine_issues').insert({ ...row, source: 'krok' }).select('id').single()
  return error || !data ? { success: false, error: 'Číslo sa nepodarilo pridať.' } : { success: true, id: data.id }
}

/**
 * Načíta čísla zo Zachej.sk a pridá chýbajúce (obálka sa skopíruje na B2).
 * Existujúce čísla sa nemenia – doplní sa im len chýbajúci odkaz alebo obálka.
 */
export async function syncFromZachej(db: SupabaseClient, opts: { since?: number } = {}): Promise<{ added: string[]; updated: string[]; errors: string[] }> {
  const res = await fetch(`${ZACHEJ}/filter/nasa-zilinska-dieceza/`, { headers: UA, cache: 'no-store' })
  if (!res.ok) throw new Error(`Zachej.sk vrátil ${res.status}`)
  const html = await res.text()
  const links = Array.from(new Set(Array.from(html.matchAll(/href="(\/produkt\/\d+\/[^"/]*nasa-zilinska[^"/]*\/)"/g)).map((m) => m[1])))
  const existing = await listIssues(db)
  const bySort = new Map(existing.map((e) => [e.sort_index, e]))
  const added: string[] = []
  const updated: string[] = []
  const errors: string[] = []

  for (const path of links) {
    try {
      const page = await (await fetch(`${ZACHEJ}${path}`, { headers: UA, cache: 'no-store' })).text()
      const title = page.match(/<title>([^<•]+)/)?.[1] ?? ''
      const issue = parseIssue(title.match(/(\d{1,2}\s*\/\s*\d{4})/)?.[1] ?? '')
      if (!issue || (opts.since && issue.sort < opts.since)) continue
      const link = `${ZACHEJ}${path}`
      const ogImage = page.match(/<meta property="og:image" content="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') ?? null
      const have = bySort.get(issue.sort)
      if (have) {
        const patch: Record<string, string> = {}
        if (!have.link_url) patch.link_url = link
        if (!have.cover_url && ogImage) {
          const img = await fetch(ogImage, { headers: UA })
          const url = img.ok ? await storeCover(Buffer.from(await img.arrayBuffer())) : null
          if (url) patch.cover_url = url
        }
        if (Object.keys(patch).length) {
          await db.from('diocese_magazine_issues').update(patch).eq('id', have.id)
          updated.push(issue.label)
        }
        continue
      }
      let cover: string | null = null
      if (ogImage) {
        const img = await fetch(ogImage, { headers: UA })
        if (img.ok) cover = await storeCover(Buffer.from(await img.arrayBuffer()))
      }
      const { error } = await db.from('diocese_magazine_issues').insert({
        issue_number: issue.label,
        sort_index: issue.sort,
        title: `Naša Žilinská diecéza ${issue.label}`,
        cover_url: cover,
        link_url: link,
        published: true,
        source: 'zachej',
        source_id: path,
      })
      if (error) errors.push(`${issue.label}: ${error.message}`)
      else added.push(issue.label)
    } catch (e) {
      errors.push(`${path}: ${e instanceof Error ? e.message : 'chyba'}`)
    }
  }
  return { added: added.sort(), updated, errors }
}
