/**
 * D1 – stiahne články živého dcza.sk (NetBase) za posledné 2 roky (§ 20, O70, O73) → data/dcza/live.json
 * Prechádza zoznamy sekcií (?pg=N), z každého článku vezme dátum, nadpis, perex, hlavný obrázok a text.
 *
 *   npx tsx scripts/dcza/fetch-live.ts            → všetky sekcie
 *   npx tsx scripts/dcza/fetch-live.ts udalosti   → len jedna sekcia (test)
 */
import { writeFileSync } from 'node:fs'

const BASE = 'https://www.dcza.sk'
const CUTOFF = new Date(Date.now() - 2 * 365 * 86400000) // O73: posledné 2 roky

/** sekcia živého webu → kategória nového webu */
export const SECTIONS: { path: string; category: string }[] = [
  { path: '/sk/dokumenty/udalosti', category: 'udalosti' },
  { path: '/sk/dokumenty/pozvanky', category: 'pozvanky' },
  { path: '/sk/ostatne/zo-zivota-farnosti', category: 'farnosti' },
  { path: '/sk/ostatne/zamyslenia', category: 'zamyslenia' },
  { path: '/sk/dokumenty/pastoracia/aktuality-z-charity', category: 'aktuality-z-charity' },
  { path: '/sk/dokumenty/biskup/dokumenty-a-homilie', category: 'homilie' },
  { path: '/sk/dokumenty/biskup/pastierske-listy-kbs', category: 'pastierke-listy' },
  { path: '/sk/dokumenty/jubilejny-rok-2025', category: 'jubilejny-rok' },
  { path: '/sk/dokumenty/pastoracia/pastoracia-mladeze', category: 'pastoracia' },
  { path: '/sk/dokumenty/pastoracia/pastoracia-rodin', category: 'pastoracia' },
  { path: '/sk/dokumenty/pastoracia/pastoracia-deti', category: 'pastoracia' },
  { path: '/sk/dokumenty/pastoracia/pastoracia-chorych', category: 'pastoracia' },
  { path: '/sk/dokumenty/pastoracia/pastoracia-povolani', category: 'pastoracia' },
  { path: '/sk/dokumenty/institut-communio', category: 'institut-communio' },
]

export interface LiveArticle {
  url: string
  section: string
  category: string
  date: string | null
  title: string
  excerpt: string
  image: string | null
  body: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(url: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'KROK-migracia (mojkrok@dcza.sk)' } })
      if (res.ok) return await res.text()
      if (res.status === 404) return null
    } catch {
      /* skúsiť znova */
    }
    await sleep(1000 * (i + 1))
  }
  return null
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&([a-z])acute;/g, (_, c) => ({ e: 'é', a: 'á', i: 'í', o: 'ó', u: 'ú', y: 'ý' } as Record<string, string>)[c] ?? c)

function parseArticle(html: string, url: string, section: string, category: string): LiveArticle | null {
  const start = html.indexOf('<div id="DataBg">')
  if (start < 0) return null
  const end = html.indexOf('<div class="docfb">', start)
  const block = html.slice(start, end > 0 ? end : start + 200000)
  const dm = block.match(/<div id="DataDate"[^>]*>\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/)
  const date = dm ? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}` : null
  const title = decode((block.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/<[^>]+>/g, '').trim())
  const annot = block.match(/<div class="docannot">([\s\S]*?)<\/div>/)?.[1] ?? ''
  const image = annot.match(/href="(\/files\/\d+)-/)?.[1] ?? block.match(/src="(\/files\/\d+)-/)?.[1] ?? null
  const excerpt = decode(annot.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  let body = block.slice(block.indexOf('</div>', block.indexOf('<div class="docimg"')) + 6)
  body = body.replace(/<hr \/>\s*<div style="float : right">[\s\S]*$/, '').replace(/<div style="clear : left;"><\/div>/g, '').trim()
  return { url, section, category, date, title, excerpt, image: image ? `${BASE}${image}-` : null, body }
}

async function crawlSection(path: string, category: string, seen: Set<string>): Promise<LiveArticle[]> {
  const out: LiveArticle[] = []
  for (let pg = 1; pg <= 200; pg++) {
    const list = await get(`${BASE}${path}${pg > 1 ? `?pg=${pg}` : ''}`)
    if (!list) break
    const links = Array.from(new Set(Array.from(list.matchAll(/<div class="doclist">[\s\S]*?<a href="(\/sk\/[^"#?]+)"/g)).map((m) => m[1])))
    const fresh = links.filter((l) => !seen.has(l))
    if (!fresh.length) break
    let older = 0
    for (let i = 0; i < fresh.length; i += 4) {
      const batch = await Promise.all(
        fresh.slice(i, i + 4).map(async (l) => {
          seen.add(l)
          const html = await get(`${BASE}${l}`)
          return html ? parseArticle(html, l, path, category) : null
        })
      )
      for (const a of batch) {
        if (!a) continue
        if (a.date && new Date(a.date) < CUTOFF) older++
        else out.push(a)
      }
      await sleep(300)
    }
    // zoznam je od najnovších – keď je celá strana staršia ako hranica, končíme
    if (older === fresh.length) break
    process.stdout.write('.')
  }
  return out
}

async function main() {
  const only = process.argv[2]
  const seen = new Set<string>()
  const all: LiveArticle[] = []
  for (const s of SECTIONS.filter((s) => !only || s.path.endsWith(only))) {
    const items = await crawlSection(s.path, s.category, seen)
    console.log(`\n${s.path}: ${items.length}`)
    all.push(...items)
  }
  writeFileSync(`../data/dcza/live${only ? `-${only}` : ''}.json`, JSON.stringify({ fetched_at: new Date().toISOString(), cutoff: CUTOFF.toISOString().slice(0, 10), articles: all }))
  console.log(`spolu ${all.length} článkov od ${CUTOFF.toISOString().slice(0, 10)}`)
}
main()
