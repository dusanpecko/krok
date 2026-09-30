/**
 * Stiahne schematizmus farností a duchovných správ Žilinskej diecézy z dcza.sk
 * (verejný oficiálny register) do data/schematizmus.json – podklad pre import farností.
 *
 *   npx tsx scripts/fetch-schematizmus.ts
 *
 * Šetrne: 1 požiadavka každých 700 ms, výsledok sa cachuje (opakované spustenie
 * sťahuje len chýbajúce stránky; --refresh stiahne všetko znova).
 */
import fs from 'fs'
import path from 'path'

const BASE = 'https://dcza.sk'
const OUT = path.resolve(__dirname, '../../data/schematizmus.json')
const REFRESH = process.argv.includes('--refresh')
const SKIP = new Set(['rozdelenie-ulic-do-farnosti-v-martine', 'rozdelenie-ulic-do-farnosti-v-ziline'])

export interface SchematizmusEntry {
  slug: string
  url: string
  name: string
  kind: 'parish' | 'chaplaincy'
  deanery: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  clergy: { name: string; position: string }[]
  population: number | null
  catholics: number | null
  adoration_note: string | null
  churches: string[]
}

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/\s+/g, ' ')
    .trim()

const num = (s: string | undefined) => {
  const d = (s ?? '').replace(/[^\d]/g, '')
  return d ? Number(d) : null
}

function parse(slug: string, html: string): SchematizmusEntry {
  const panel = html.match(/<div class="rightdtapanel">([\s\S]*?)<h1>/)?.[1] ?? ''
  const name = decode(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? slug)
  const row = (label: string) => {
    const m = panel.match(new RegExp(`<i>${label}:<\\/i><\\/td><td>([\\s\\S]*?)<\\/td>`))
    return m ? decode(m[1]) || null : null
  }
  // Adresa: 1. riadok ulica, 2. riadok „PSČ Obec“
  const addr = panel.match(/<i>Adresa:<\/i><\/td><td>([\s\S]*?)<\/td><\/tr><tr><td>&nbsp;<\/td><td>([\s\S]*?)<\/td>/)
  const cityLine = addr ? decode(addr[2]) : null
  const pc = cityLine?.match(/^(\d{3}\s?\d{2})\s+(.+)$/)

  const clergy: { name: string; position: string }[] = []
  const clergyList = panel.match(/<h2>Zoznam kňazov<\/h2>\s*<ul>([\s\S]*?)<\/ul>/)?.[1] ?? ''
  for (const m of clergyList.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    const t = decode(m[1])
    const [n, ...pos] = t.split(' - ')
    if (n) clergy.push({ name: n.trim(), position: pos.join(' - ').trim() })
  }

  const content = html.slice(html.indexOf('<h1>'))
  const stat = (label: string) => content.match(new RegExp(`${label}:?\\s*<\\/span>:?\\s*([^<]+)`))?.[1]
  const adoration = content.match(/Výročná celodenná poklona:?\s*<\/span>:?\s*([^<]+)/)?.[1]
  // Kostoly: prvý zoznam za štatistikou
  const firstUl = content.match(/<\/p>\s*(?:<p>[\s\S]*?<\/p>\s*)?<ul>([\s\S]*?)<\/ul>/)?.[1] ?? ''
  const churches = [...firstUl.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => decode(m[1])).filter((c) => c && !/kaplán|farár|administrátor/i.test(c))

  const website = row('WWW')
  return {
    slug,
    url: `${BASE}/sk/schematizmus/farnosti/${slug}`,
    name,
    kind: /^duchovn/i.test(slug) ? 'chaplaincy' : 'parish',
    deanery: decode(panel.match(/<i>Dekanát:<\/i><\/td><td>([\s\S]*?)<\/td>/)?.[1] ?? '') || null,
    street: addr ? decode(addr[1]) || null : null,
    postal_code: pc ? pc[1].replace(/\s/g, '').replace(/^(\d{3})(\d{2})$/, '$1 $2') : null,
    city: pc ? pc[2] : cityLine,
    phone: row('Tel'),
    email: row('E-mail')?.toLowerCase() ?? null,
    website: website ? website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : null,
    clergy,
    population: num(stat('Obyvateľov')),
    catholics: num(stat('Rímskokatolíkov')),
    adoration_note: adoration ? decode(adoration) || null : null,
    churches,
  }
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'KROK import (mojkrok.sk)' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const cache: Record<string, SchematizmusEntry> =
    !REFRESH && fs.existsSync(OUT) ? Object.fromEntries((JSON.parse(fs.readFileSync(OUT, 'utf8')) as SchematizmusEntry[]).map((e) => [e.slug, e])) : {}

  const index = await get(`${BASE}/sk/schematizmus/farnosti`)
  const slugs = [...new Set([...index.matchAll(/href="\/sk\/schematizmus\/farnosti\/([a-z0-9-]+)"/g)].map((m) => m[1]))].filter((s) => !SKIP.has(s))
  console.log(`Zoznam: ${slugs.length} farností a duchovných správ`)

  for (const [i, slug] of slugs.entries()) {
    if (cache[slug]) continue
    await sleep(700)
    try {
      cache[slug] = parse(slug, await get(`${BASE}/sk/schematizmus/farnosti/${slug}`))
      process.stdout.write(`\r${i + 1}/${slugs.length} ${slug.padEnd(60)}`)
    } catch (e) {
      console.error(`\n${slug}: ${e instanceof Error ? e.message : e}`)
    }
  }
  const list = slugs.map((s) => cache[s]).filter(Boolean)
  fs.writeFileSync(OUT, JSON.stringify(list, null, 2))
  console.log(`\nUložené: ${path.relative(process.cwd(), OUT)} (${list.length})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
