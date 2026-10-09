import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Dokumenty webu dcza.sk (O77): vlastné (source=krok – súbor alebo odkaz, otvorí sa u nás)
 * a synchronizované z kbs.sk (source=kbs – otvorí sa na kbs.sk). Serverový modul.
 */

export interface DioceseDocument {
  id: string
  section: string
  group_label: string | null
  title: string
  description: string | null
  url: string
  file_name: string | null
  issued_on: string | null
  sort_order: number
  published: boolean
  source: 'krok' | 'kbs'
  synced_at: string | null
}

export const DOCUMENT_SECTIONS: Record<string, { title: string; kbs?: string }> = {
  'dokumenty-papezov': { title: 'Dokumenty pápežov', kbs: 'https://kbs.sk/obsah/sekcia/h/dokumenty-a-vyhlasenia/p/dokumenty-papezov' },
}

const KBS = 'https://kbs.sk'
const UA = { 'User-Agent': 'Mozilla/5.0 (dcza.sk)' }

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…',
  aacute: 'á', Aacute: 'Á', auml: 'ä', Auml: 'Ä', eacute: 'é', Eacute: 'É', iacute: 'í', Iacute: 'Í', oacute: 'ó', Oacute: 'Ó', ocirc: 'ô', Ocirc: 'Ô',
  uacute: 'ú', Uacute: 'Ú', yacute: 'ý', Yacute: 'Ý', ouml: 'ö', uuml: 'ü', scaron: 'š', Scaron: 'Š', zcaron: 'ž', Zcaron: 'Ž', ccaron: 'č', Ccaron: 'Č',
  dcaron: 'ď', Dcaron: 'Ď', ncaron: 'ň', Ncaron: 'Ň', tcaron: 'ť', Tcaron: 'Ť', lcaron: 'ľ', Lcaron: 'Ľ', racute: 'ŕ', lacute: 'ĺ',
}

const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, ' ')
    .trim()

/** Odkazy z obsahovej časti stránky kbs.sk (bez menu a pätičky). */
function contentLinks(html: string): { path: string; title: string }[] {
  const start = html.indexOf('<div class="right_box">')
  const end = html.indexOf('Nastavenie Cookies', start)
  const block = html.slice(start, end > 0 ? end : undefined)
  const out: { path: string; title: string }[] = []
  for (const m of block.matchAll(/<a[^>]+href="(\/obsah\/sekcia\/c\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const title = text(m[2])
    if (title && !out.some((o) => o.path === m[1])) out.push({ path: m[1], title })
  }
  return out
}

/** Načíta dokumenty pápežov z kbs.sk a doplní nové (podľa adresy); zmenený názov aktualizuje. */
export async function syncKbsDocuments(db: SupabaseClient, section = 'dokumenty-papezov'): Promise<{ added: number; updated: number; groups: string[]; errors: string[] }> {
  const src = DOCUMENT_SECTIONS[section]?.kbs
  if (!src) return { added: 0, updated: 0, groups: [], errors: ['Sekcia nemá zdroj na kbs.sk.'] }
  const index = await (await fetch(src, { headers: UA, cache: 'no-store' })).text()
  const popes = contentLinks(index)
  const { data: existing } = await db.from('diocese_documents').select('id, source_id, title, group_label, sort_order').eq('source', 'kbs').eq('section', section)
  const bySource = new Map((existing ?? []).map((e) => [e.source_id as string, e]))
  let added = 0
  let updated = 0
  const errors: string[] = []
  const groups: string[] = []
  for (const [gi, pope] of popes.entries()) {
    try {
      const html = await (await fetch(`${KBS}${pope.path}`, { headers: UA, cache: 'no-store' })).text()
      const docs = contentLinks(html)
      groups.push(`${pope.title} (${docs.length})`)
      const now = new Date().toISOString()
      // poradie: skupiny podľa pápeža (od súčasného), v skupine ako na kbs.sk (najnovšie hore)
      const rows = docs.map((d, i) => ({ d, sort: (gi + 1) * 10000 + i }))
      for (const { d, sort } of rows) {
        const have = bySource.get(d.path)
        if (have) {
          if (have.title !== d.title || have.group_label !== pope.title || have.sort_order !== sort) {
            await db.from('diocese_documents').update({ title: d.title, group_label: pope.title, sort_order: sort, synced_at: now }).eq('id', have.id)
            updated++
          }
          continue
        }
        const { error } = await db.from('diocese_documents').insert({ section, group_label: pope.title, title: d.title, url: `${KBS}${d.path}`, sort_order: sort, source: 'kbs', source_id: d.path, synced_at: now, published: true })
        if (error) errors.push(`${d.title}: ${error.message}`)
        else added++
      }
    } catch (e) {
      errors.push(`${pope.title}: ${e instanceof Error ? e.message : 'chyba'}`)
    }
  }
  return { added, updated, groups, errors }
}

export async function listDocuments(db: SupabaseClient, section: string, opts: { all?: boolean } = {}): Promise<DioceseDocument[]> {
  let q = db.from('diocese_documents').select('id, section, group_label, title, description, url, file_name, issued_on, sort_order, published, source, synced_at').eq('section', section)
  if (!opts.all) q = q.eq('published', true)
  const { data } = await q.order('sort_order').order('created_at', { ascending: false }).limit(5000)
  return (data ?? []) as DioceseDocument[]
}
