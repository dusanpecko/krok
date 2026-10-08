import type { SupabaseClient } from '@supabase/supabase-js'
import { htmlToText } from '@/lib/html/sanitize'
import { foldText, searchTerms, type DocStatus, type ZoneCategory, type ZoneDoc, type ZoneDocSummary, type ZoneFile, type ZoneSearchHit } from './types'

/** Čítanie dokumentov kňazskej zóny + fulltext (§ 15). Serverový modul – volá sa až po kontrole prístupu. */

const DOC_COLUMNS =
  'id, category_id, title, doc_number, issued_on, summary, status, published_at, clergy_doc_categories!inner(name, slug), clergy_doc_files(id, file_name, mime_type, size_bytes, sort_order, content_text)'

type DocRow = {
  id: string
  category_id: string
  title: string
  doc_number: string | null
  issued_on: string | null
  summary: string | null
  status: DocStatus
  published_at: string | null
  body?: string | null
  clergy_doc_categories: { name: string; slug: string }
  clergy_doc_files: { id: string; file_name: string; mime_type: string | null; size_bytes: number; sort_order: number; content_text?: string | null }[] | null
}

function toSummary(r: DocRow): ZoneDocSummary {
  return {
    id: r.id,
    category_id: r.category_id,
    category_name: r.clergy_doc_categories.name,
    category_slug: r.clergy_doc_categories.slug,
    title: r.title,
    doc_number: r.doc_number,
    issued_on: r.issued_on,
    summary: r.summary,
    status: r.status,
    published_at: r.published_at,
    files: [...(r.clergy_doc_files ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f): ZoneFile => ({ id: f.id, file_name: f.file_name, mime_type: f.mime_type, size_bytes: Number(f.size_bytes), has_text: !!f.content_text })),
  }
}

// zoznamy nečítajú text súborov (môže mať stovky kB) – has_text je tam vždy false
const LIST_COLUMNS = DOC_COLUMNS.replace(', content_text)', ')')

export async function listCategories(db: SupabaseClient, opts: { all?: boolean } = {}): Promise<(ZoneCategory & { current: number; archived: number })[]> {
  let q = db.from('clergy_doc_categories').select('id, slug, name, description, sort_order, is_visible').order('sort_order')
  if (!opts.all) q = q.eq('is_visible', true)
  const [{ data: cats }, { data: docs }] = await Promise.all([q, db.from('clergy_docs').select('category_id, status').eq('published', true)])
  return ((cats ?? []) as ZoneCategory[]).map((c) => ({
    ...c,
    current: (docs ?? []).filter((d) => d.category_id === c.id && d.status === 'current').length,
    archived: (docs ?? []).filter((d) => d.category_id === c.id && d.status === 'archived').length,
  }))
}

export async function listRecentDocs(db: SupabaseClient, limit = 8): Promise<ZoneDocSummary[]> {
  const { data } = await db.from('clergy_docs').select(LIST_COLUMNS).eq('published', true).eq('clergy_doc_categories.is_visible', true).order('published_at', { ascending: false }).limit(limit)
  return ((data ?? []) as unknown as DocRow[]).map(toSummary)
}

export async function listCategoryDocs(db: SupabaseClient, categoryId: string, status: DocStatus, year?: number | null): Promise<ZoneDocSummary[]> {
  let q = db.from('clergy_docs').select(LIST_COLUMNS).eq('published', true).eq('category_id', categoryId).eq('status', status)
  if (year) q = q.gte('issued_on', `${year}-01-01`).lte('issued_on', `${year}-12-31`)
  const { data } = await q.order('issued_on', { ascending: false, nullsFirst: false }).order('published_at', { ascending: false }).limit(500)
  return ((data ?? []) as unknown as DocRow[]).map(toSummary)
}

/** Roky vydania v kategórii (filter). */
export async function categoryYears(db: SupabaseClient, categoryId: string, status: DocStatus): Promise<number[]> {
  const { data } = await db.from('clergy_docs').select('issued_on').eq('published', true).eq('category_id', categoryId).eq('status', status).not('issued_on', 'is', null)
  return Array.from(new Set((data ?? []).map((d) => Number(String(d.issued_on).slice(0, 4))))).sort((a, b) => b - a)
}

export async function getZoneDoc(db: SupabaseClient, id: string, opts: { includeDrafts?: boolean } = {}): Promise<ZoneDoc | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  let q = db.from('clergy_docs').select(`${DOC_COLUMNS}, body`).eq('id', id)
  if (!opts.includeDrafts) q = q.eq('published', true)
  const { data } = await q.maybeSingle()
  if (!data) return null
  const row = data as unknown as DocRow
  return { ...toSummary(row), body: row.body ?? null }
}

// ------------------------------------------------------------ fulltext

/** Prepočíta normalizovaný text dokumentu (názov, číslo, popis, text, kategória, súbory a ich obsah). */
export async function rebuildSearchText(db: SupabaseClient, docId: string): Promise<void> {
  const { data } = await db.from('clergy_docs').select(`${DOC_COLUMNS}, body`).eq('id', docId).maybeSingle()
  if (!data) return
  const r = data as unknown as DocRow
  const parts = [
    r.title,
    r.doc_number ?? '',
    r.summary ?? '',
    r.clergy_doc_categories.name,
    htmlToText(r.body, 200_000),
    ...(r.clergy_doc_files ?? []).flatMap((f) => [f.file_name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '), f.content_text ?? '']),
  ]
  const text = foldText(parts.join('\n')).replace(/\s+/g, ' ').slice(0, 900_000)
  await db.from('clergy_docs').update({ search_text: text }).eq('id', docId)
}

const SNIPPET_RADIUS = 110

function makeSnippet(text: string, terms: string[]): { text: string; hit: boolean }[] | null {
  const folded = foldText(text)
  // prvý výskyt ktoréhokoľvek slova na začiatku slova
  let first = -1
  for (const t of terms) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u')
    const m = re.exec(folded)
    if (m && (first < 0 || m.index + m[1].length < first)) first = m.index + m[1].length
  }
  if (first < 0) return null
  const start = Math.max(0, first - SNIPPET_RADIUS)
  const end = Math.min(text.length, first + SNIPPET_RADIUS * 1.5)
  const win = text.slice(start, end).replace(/\s+/g, ' ')
  const fwin = foldText(win)
  // zvýraznenie všetkých slov v okne
  const marks: [number, number][] = []
  for (const t of terms) {
    let i = 0
    while ((i = fwin.indexOf(t, i)) >= 0) {
      let j = i + t.length
      while (j < fwin.length && /[\p{L}\p{N}]/u.test(fwin[j])) j++
      marks.push([i, j])
      i = j
    }
  }
  marks.sort((a, b) => a[0] - b[0])
  const parts: { text: string; hit: boolean }[] = []
  let pos = 0
  for (const [a, b] of marks) {
    if (a < pos) continue
    if (a > pos) parts.push({ text: win.slice(pos, a), hit: false })
    parts.push({ text: win.slice(a, b), hit: true })
    pos = b
  }
  if (pos < win.length) parts.push({ text: win.slice(pos), hit: false })
  if (start > 0) parts.unshift({ text: '… ', hit: false })
  if (end < text.length) parts.push({ text: ' …', hit: false })
  return parts
}

export const SEARCH_PAGE = 20

/** Fulltext: všetky slová (aj začiatky slov – „birmov“ nájde „birmovanie“), bez ohľadu na diakritiku. */
export async function searchDocs(
  db: SupabaseClient,
  q: string,
  opts: { categoryId?: string | null; page?: number } = {}
): Promise<{ hits: ZoneSearchHit[]; hasMore: boolean; terms: string[] }> {
  const terms = searchTerms(q)
  if (!terms.length) return { hits: [], hasMore: false, terms }
  const page = Math.max(1, opts.page ?? 1)
  let query = db
    .from('clergy_docs')
    .select(`${DOC_COLUMNS}, body`)
    .eq('published', true)
    .eq('clergy_doc_categories.is_visible', true)
    .textSearch('search_tsv', terms.map((t) => `${t}:*`).join(' & '), { config: 'simple' })
  if (opts.categoryId) query = query.eq('category_id', opts.categoryId)
  const { data } = await query
    .order('status', { ascending: true })
    .order('issued_on', { ascending: false, nullsFirst: false })
    .range((page - 1) * SEARCH_PAGE, page * SEARCH_PAGE)
  const rows = (data ?? []) as unknown as DocRow[]
  const hits = rows.slice(0, SEARCH_PAGE).map((r): ZoneSearchHit => {
    const snippets: ZoneSearchHit['snippets'] = []
    const bodyText = htmlToText(r.body, 200_000)
    const fromBody = bodyText && makeSnippet(bodyText, terms)
    if (fromBody) snippets.push({ parts: fromBody, source: 'Text' })
    for (const f of [...(r.clergy_doc_files ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
      if (snippets.length >= 2) break
      const s = f.content_text && makeSnippet(f.content_text, terms)
      if (s) snippets.push({ parts: s, source: f.file_name })
    }
    return { ...toSummary(r), snippets }
  })
  return { hits, hasMore: rows.length > SEARCH_PAGE, terms }
}
