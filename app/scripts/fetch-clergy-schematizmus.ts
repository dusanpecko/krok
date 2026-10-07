/**
 * Stiahne verejný schematizmus kňazov Žilinskej diecézy z dcza.sk do data/schematizmus-knazi.json –
 * doplnok k importu registra kňazov (krok_navrh_farnosti.md § 16.6): Pochádza, miesto diakonátu
 * a presbyterátu, história pôsobenia po rokoch, dekanát a farnosť (Excel tieto údaje nemá).
 *
 *   npx tsx scripts/fetch-clergy-schematizmus.ts            (cache – sťahuje len chýbajúce)
 *   npx tsx scripts/fetch-clergy-schematizmus.ts --refresh  (všetko znova)
 *
 * Šetrne: 1 požiadavka každých 700 ms.
 */
import fs from 'fs'
import path from 'path'

const BASE = 'https://dcza.sk'
const OUT = path.resolve(__dirname, '../../data/schematizmus-knazi.json')
const REFRESH = process.argv.includes('--refresh')

export interface SchematizmusPriest {
  slug: string
  url: string
  /** z nadpisu: „Pecko Dušan - riaditeľ pastoračného fondu“ */
  heading: string
  /** meno s titulmi z tela stránky: „Mgr. Dušan Pecko“ */
  full_name: string | null
  function: string | null
  origin: string | null
  diaconate: string | null
  presbyterate: string | null
  history: string[]
  deanery: { slug: string; name: string } | null
  parish: { slug: string; name: string } | null
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
    .replace(/&eacute;/g, 'é')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&yacute;/g, 'ý')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function labeled(body: string, label: string): string | null {
  const m = body.match(new RegExp(`${label}:?\\s*<\\/span>([\\s\\S]*?)(?:<br\\s*\\/?>|<\\/p>|<span)`, 'i'))
  const v = m ? decode(m[1]) : ''
  return v || null
}

function parse(slug: string, html: string): SchematizmusPriest {
  const heading = decode(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? slug)
  const panel = html.match(/<div class="rightdtapanel">([\s\S]*?)<\/table>/)?.[1] ?? ''
  const link = (label: string) => {
    const m = panel.match(new RegExp(`<i>${label}:<\\/i><\\/td><td><a href="\\/sk\\/schematizmus\\/[a-z]+\\/([a-z0-9-]+)"><b>([\\s\\S]*?)<\\/b>`))
    return m ? { slug: m[1], name: decode(m[2]).replace(/^#\s*/, '') } : null
  }
  const body = html.split('<div class="docannot"></div>')[1]?.split('<div style="clear : both;">')[0] ?? ''
  const fullName = decode(body.match(/<p><span style="font-weight: bold;">([\s\S]*?)<\/span><\/p>/)?.[1] ?? '') || null
  const history = [...(body.match(/<ul>([\s\S]*?)<\/ul>/)?.[1] ?? '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => decode(m[1])).filter(Boolean)
  const dash = heading.indexOf(' - ')
  return {
    slug,
    url: `${BASE}/sk/schematizmus/knazi/${slug}`,
    heading,
    full_name: fullName,
    function: dash > 0 ? heading.slice(dash + 3).trim() || null : null,
    origin: labeled(body, 'Pochádza'),
    diaconate: labeled(body, 'Diakonát'),
    presbyterate: labeled(body, 'Presbyterát'),
    history,
    deanery: link('Dekanát'),
    parish: link('Farnosť'),
  }
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'KROK import (mojkrok.sk)' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const cache: Record<string, SchematizmusPriest> =
    !REFRESH && fs.existsSync(OUT) ? Object.fromEntries((JSON.parse(fs.readFileSync(OUT, 'utf8')) as SchematizmusPriest[]).map((e) => [e.slug, e])) : {}

  const index = await get(`${BASE}/sk/schematizmus/knazi`)
  const slugs = [...new Set([...index.matchAll(/href="\/sk\/schematizmus\/knazi\/([a-z0-9-]+)"/g)].map((m) => m[1]))]
  console.log(`Zoznam: ${slugs.length} kňazov`)

  for (const [i, slug] of slugs.entries()) {
    if (cache[slug]) continue
    await sleep(700)
    try {
      cache[slug] = parse(slug, await get(`${BASE}/sk/schematizmus/knazi/${slug}`))
      process.stdout.write(`\r${i + 1}/${slugs.length} ${slug.padEnd(70)}`)
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
