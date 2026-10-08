/**
 * D1 – import webu diecézy do Kroku (§ 20, O70, O73).
 *   - stránky, kategórie, články, akcie, časopis z bety (data/dcza/beta.json)
 *   - články zo živého dcza.sk za 2 roky (data/dcza/live.json), duplicity s betou sa zlúčia
 *   - obrázky a prílohy sa skopírujú na B2 (obrázky → WebP, max. 2000 px), adresy v texte sa prepíšu
 *   - presmerovania starých adries živého webu (/sk/…) na nové
 *
 *   npx tsx scripts/dcza/import.ts            → dry-run (súhrn, nič nezapisuje)
 *   npx tsx scripts/dcza/import.ts --apply    → zápis (opakovateľný: --replace zmaže predchádzajúci import)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import sanitizeHtml from 'sanitize-html'
import { createClient } from '@supabase/supabase-js'
import { uploadBuffer } from '../../src/lib/storage'

const APPLY = process.argv.includes('--apply')
const REPLACE = process.argv.includes('--replace')
const DATA = '../data/dcza'
const MEDIA_MAP = `${DATA}/media-map.json`
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type WpText = { rendered: string }
interface WpPage { id: number; slug: string; title: WpText; parent: number; link: string; menu_order: number; content: WpText; excerpt: WpText; featured_media: number; status: string }
interface WpPost { id: number; slug: string; title: WpText; link: string; date: string; content: WpText; excerpt: WpText; categories: number[]; featured_media: number; status: string }
interface WpCat { id: number; slug: string; name: string }
interface WpEvent { id: number; slug: string; title: WpText; content: WpText; meta: Record<string, string>; featured_media: number }
interface WpMag { id: number; slug: string; title: WpText; date: string; meta: Record<string, string | number> }
interface WpMedia { id: number; source_url: string }
interface LiveArticle { url: string; section: string; category: string; date: string | null; title: string; excerpt: string; image: string | null; body: string }

const beta = JSON.parse(readFileSync(`${DATA}/beta.json`, 'utf8')) as { pages: WpPage[]; posts: WpPost[]; categories: WpCat[]; akcie: WpEvent[]; casopis: WpMag[]; media: WpMedia[] }
const live = existsSync(`${DATA}/live.json`) ? (JSON.parse(readFileSync(`${DATA}/live.json`, 'utf8')) as { articles: LiveArticle[] }).articles : []
const mediaById = new Map(beta.media.map((m) => [m.id, m.source_url]))

// ------------------------------------------------------------ pomocné

const decode = (s: string) =>
  s.replace(/&#8211;/g, '–').replace(/&#8222;/g, '„').replace(/&#8220;/g, '“').replace(/&#8217;/g, '’').replace(/&#8230;/g, '…').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const slugify = (s: string) => fold(s).replace(/\s+/g, '-').slice(0, 90) || 'clanok'

/** kategórie nového webu (čisté slugy) + mapovanie zo slugov bety */
const CATEGORIES: { slug: string; name: string; beta?: string[] }[] = [
  { slug: 'udalosti', name: 'Udalosti', beta: ['udalosti'] },
  { slug: 'pozvanky', name: 'Pozvánky', beta: ['pozvanky'] },
  { slug: 'zo-zivota-farnosti', name: 'Zo života farností', beta: ['farnosti'] },
  { slug: 'zamyslenia', name: 'Zamyslenia', beta: ['zamyslenia'] },
  { slug: 'homilie', name: 'Homílie', beta: ['homilie'] },
  { slug: 'pastierske-listy', name: 'Pastierske listy', beta: ['pastierke-listy'] },
  { slug: 'biskup', name: 'Biskup', beta: ['biskup'] },
  { slug: 'pastoracia', name: 'Pastorácia' },
  { slug: 'aktuality-z-charity', name: 'Aktuality z charity', beta: ['aktuality-z-charity'] },
  { slug: 'projekty', name: 'Projekty', beta: ['projekty'] },
  { slug: 'jubilejny-rok', name: 'Jubilejný rok', beta: ['jubilejny-rok'] },
  { slug: 'cirkevny-sud', name: 'Cirkevný súd', beta: ['cirkevny-sud'] },
  { slug: 'vyveska', name: 'Výveska', beta: ['vyveska'] },
  { slug: 'institut-communio', name: 'Inštitút Communio' },
]
const LIVE_CATEGORY: Record<string, string> = { farnosti: 'zo-zivota-farnosti', 'pastierke-listy': 'pastierske-listy' }
const catByBeta = new Map<number, string>()
for (const c of beta.categories) {
  const target = CATEGORIES.find((x) => x.beta?.includes(c.slug))
  if (target) catByBeta.set(c.id, target.slug)
}

/** stránky bety, ktoré nahradia naše dáta (register kňazov, stránky farností – D4) */
const SKIP_PAGE = (path: string) =>
  path === 'bagin-jozef' || path.startsWith('o-nas/schematizmus/knazi') || path.startsWith('o-nas/schematizmus/farnosti') || path === 'o-nas/schematizmus/dekanaty' || path === 'o-nas/schematizmus/filialky'

// ------------------------------------------------------------ médiá (B2)

const mediaMap: Record<string, string> = existsSync(MEDIA_MAP) ? JSON.parse(readFileSync(MEDIA_MAP, 'utf8')) : {}
let mediaNew = 0
let mediaFail = 0

function normalizeMediaUrl(u: string): string {
  let url = decode(u).trim()
  if (url.startsWith('//')) url = `https:${url}`
  if (url.startsWith('/files/')) url = `https://www.dcza.sk${url}`
  url = url.replace(/^http:\/\//, 'https://').replace('https://dcza.sk/', 'https://www.dcza.sk/')
  // NetBase: /files/ID-?type=4&img_w=… → originál /files/ID-?type=4
  const nb = url.match(/^https:\/\/www\.dcza\.sk\/files\/(\d+)-/)
  if (nb) return `https://www.dcza.sk/files/${nb[1]}-?type=4`
  // WordPress: odstrániť -300x200 náhľad
  return url.replace(/-\d+x\d+(\.(?:jpe?g|png|webp|gif))$/i, '$1')
}

async function mirror(raw: string): Promise<string> {
  const url = normalizeMediaUrl(raw)
  if (mediaMap[url]) return mediaMap[url]
  if (!APPLY) {
    mediaNew++
    return url
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'KROK-migracia (mojkrok@dcza.sk)' } })
    if (!res.ok) throw new Error(String(res.status))
    const type = res.headers.get('content-type') ?? ''
    const buf = Buffer.from(await res.arrayBuffer())
    let out: { url: string } | null
    if (type.startsWith('image/') && !type.includes('svg') && !type.includes('gif')) {
      const webp = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
      out = await uploadBuffer(webp, 'image/webp', 'dcza/media')
    } else {
      out = await uploadBuffer(buf, type.split(';')[0] || 'application/octet-stream', 'dcza/files')
    }
    if (!out) throw new Error('upload')
    mediaMap[url] = out.url
    mediaNew++
    if (mediaNew % 20 === 0) writeFileSync(MEDIA_MAP, JSON.stringify(mediaMap))
    return out.url
  } catch {
    mediaFail++
    return url
  }
}

const isMedia = (u: string) =>
  /beta\.dcza\.dev\/wp-content\/uploads\//.test(u) || /^(https?:)?\/\/(www\.)?dcza\.sk\/files\//.test(u) || u.startsWith('/files/')

/** vyčistí HTML, prepíše obrázky/prílohy na B2 a interné odkazy bety na relatívne */
async function cleanHtml(html: string): Promise<string> {
  // vložené príspevky z Facebooku → obyčajný odkaz (bez sledovania návštevníkov)
  let h = html.replace(/<iframe[^>]+src="https:\/\/www\.facebook\.com\/plugins\/post\.php\?href=([^"&]+)[^"]*"[^>]*><\/iframe>/g, (_, href) => `<p><a href="${decodeURIComponent(href)}" target="_blank">Príspevok na Facebooku</a></p>`)
  h = sanitizeHtml(h, {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'h5', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'blockquote', 'hr', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'iframe'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'title'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], iframe: ['src', 'width', 'height', 'allowfullscreen', 'allow', 'frameborder'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
    transformTags: { h1: 'h2', div: 'p', span: (tag, attribs) => ({ tagName: 'span', attribs }) },
    exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren?.length,
    nonTextTags: ['style', 'script', 'textarea', 'noscript'],
  })
  // médiá
  const urls = new Set<string>()
  for (const m of h.matchAll(/(?:src|href)="([^"]+)"/g)) if (isMedia(m[1])) urls.add(m[1])
  for (const u of urls) {
    const to = await mirror(u)
    h = h.split(`"${u}"`).join(`"${to}"`)
  }
  // interné odkazy bety → relatívne
  h = h.replace(/href="https?:\/\/beta\.dcza\.dev(?:\/index\.php)?(\/[^"]*)"/g, 'href="$1"')
  return h.replace(/(<p>\s*<\/p>\s*)+/g, '').trim()
}

// ------------------------------------------------------------ stránky

interface PageRow { id: string; parent_id: string | null; slug: string; path: string; title: string; excerpt: string | null; content: string | null; image_url: string | null; sort_order: number; published: boolean; show_in_menu: boolean; source: string; source_id: string }

async function buildPages(): Promise<PageRow[]> {
  const pathOf = (p: WpPage) => p.link.replace(/^https:\/\/beta\.dcza\.dev\/(index\.php\/)?/, '').replace(/\/$/, '')
  const pages = beta.pages.filter((p) => p.status === 'publish' && pathOf(p) && !SKIP_PAGE(pathOf(p)))
  const idMap = new Map(pages.map((p) => [p.id, crypto.randomUUID()]))
  const hasChild = new Set(pages.map((p) => p.parent))
  const rows: PageRow[] = []
  for (const p of pages) {
    const content = await cleanHtml(p.content.rendered)
    const words = text(content).split(' ').filter(Boolean).length
    rows.push({
      id: idMap.get(p.id)!,
      parent_id: idMap.get(p.parent) ?? null,
      slug: p.slug,
      path: pathOf(p),
      title: decode(text(p.title.rendered)),
      excerpt: text(p.excerpt.rendered).slice(0, 300) || null,
      content: content || null,
      image_url: p.featured_media && mediaById.get(p.featured_media) ? await mirror(mediaById.get(p.featured_media)!) : null,
      sort_order: p.menu_order,
      // prázdna stránka bez podstránok ostane skrytá, kým ju kúria nedoplní
      published: words > 0 || hasChild.has(p.id),
      show_in_menu: true,
      source: 'beta',
      source_id: String(p.id),
    })
  }
  return rows
}

// ------------------------------------------------------------ články

interface PostRow { id: string; slug: string; title: string; excerpt: string | null; content: string | null; image_url: string | null; published_at: string; source: string; source_id: string; legacy_path: string | null; categories: string[] }

async function buildPosts(): Promise<{ rows: PostRow[]; merged: number }> {
  const rows: PostRow[] = []
  const slugs = new Set<string>()
  const uniq = (s: string) => {
    let slug = s || 'clanok'
    for (let i = 2; slugs.has(slug); i++) slug = `${s}-${i}`
    slugs.add(slug)
    return slug
  }
  for (const p of beta.posts.filter((p) => p.status === 'publish')) {
    rows.push({
      id: crypto.randomUUID(),
      slug: uniq(decodeURIComponent(p.slug)),
      title: decode(text(p.title.rendered)),
      excerpt: text(p.excerpt.rendered).replace(/\s*\[…\]$/, '').slice(0, 400) || null,
      content: (await cleanHtml(p.content.rendered)) || null,
      image_url: p.featured_media && mediaById.get(p.featured_media) ? await mirror(mediaById.get(p.featured_media)!) : null,
      published_at: new Date(p.date).toISOString(),
      source: 'beta',
      source_id: String(p.id),
      legacy_path: null,
      categories: p.categories.map((c) => catByBeta.get(c)).filter((c): c is string => !!c),
    })
  }
  // živý web: duplicitu s betou spoznáme podľa nadpisu – ponecháme betu, doplníme starú adresu a kategóriu
  let merged = 0
  const byTitle = new Map(rows.map((r) => [fold(r.title), r]))
  for (const a of live) {
    const category = LIVE_CATEGORY[a.category] ?? a.category
    const dup = byTitle.get(fold(a.title))
    if (dup) {
      merged++
      dup.legacy_path = dup.legacy_path ?? a.url
      if (!dup.categories.includes(category)) dup.categories.push(category)
      continue
    }
    const content = await cleanHtml(a.body)
    const row: PostRow = {
      id: crypto.randomUUID(),
      slug: uniq(slugify(a.url.split('/').pop() ?? a.title)),
      title: a.title,
      excerpt: a.excerpt.slice(0, 400) || null,
      content: content || null,
      image_url: a.image ? await mirror(a.image) : null,
      published_at: new Date(`${a.date ?? '2025-01-01'}T09:00:00+02:00`).toISOString(),
      source: 'live',
      source_id: a.url,
      legacy_path: a.url,
      categories: [category],
    }
    rows.push(row)
    byTitle.set(fold(a.title), row)
  }
  return { rows, merged }
}

// ------------------------------------------------------------ akcie a časopis

async function buildEvents() {
  const out = []
  for (const e of beta.akcie) {
    const m = e.meta ?? {}
    if (!m._akcia_datum_od) continue
    out.push({
      slug: `${e.slug}-${m._akcia_datum_od}`,
      title: decode(text(e.title.rendered)),
      content: (await cleanHtml(e.content.rendered)) || null,
      place: m._akcia_miesto || null,
      starts_on: m._akcia_datum_od,
      ends_on: m._akcia_datum_do || null,
      time_from: m._akcia_cas_od || null,
      time_to: m._akcia_cas_do || null,
      all_day: m._akcia_cely_den === '1',
      image_url: Number(m._akcia_img_id) && mediaById.get(Number(m._akcia_img_id)) ? await mirror(mediaById.get(Number(m._akcia_img_id))!) : null,
      source: 'beta',
      source_id: String(e.id),
    })
  }
  return out
}

async function buildMagazine() {
  const out = []
  for (const c of beta.casopis) {
    const m = c.meta ?? {}
    const cover = Number(m._casopis_img_id) ? mediaById.get(Number(m._casopis_img_id)) : null
    out.push({
      title: decode(text(c.title.rendered)),
      issue_number: String(m._casopis_cisloVydania ?? '') || null,
      sort_index: Number(m._casopis_sort_index) || 0,
      description: String(m._casopis_popis ?? '') || null,
      cover_url: cover ? await mirror(cover) : null,
      link_url: String(m._casopis_link ?? '') || null,
      source: 'beta',
      source_id: String(c.id),
    })
  }
  return out
}

// ------------------------------------------------------------ zápis

async function main() {
  const pages = await buildPages()
  const { rows: posts, merged } = await buildPosts()
  const events = await buildEvents()
  const magazine = await buildMagazine()
  const byCat = new Map<string, number>()
  for (const p of posts) for (const c of p.categories) byCat.set(c, (byCat.get(c) ?? 0) + 1)
  console.log(`stránky: ${pages.length} (${pages.filter((p) => p.published).length} zverejnených, ${pages.filter((p) => !p.published).length} prázdnych skrytých)`)
  console.log(`články: ${posts.length} (beta ${posts.filter((p) => p.source === 'beta').length}, živý web ${posts.filter((p) => p.source === 'live').length}, zlúčené duplicity ${merged})`)
  console.log('kategórie:', Object.fromEntries(byCat))
  console.log(`akcie: ${events.length}, časopis: ${magazine.length}`)
  console.log(`médiá: ${APPLY ? `nových ${mediaNew}, chýb ${mediaFail}` : `na skopírovanie ~${mediaNew}`}`)
  if (!APPLY) return console.log('\nDry-run – nič sa nezapísalo. Spustite s --apply.')

  writeFileSync(MEDIA_MAP, JSON.stringify(mediaMap))
  if (REPLACE) {
    await db.from('diocese_redirects').delete().neq('from_path', '')
    await db.from('diocese_posts').delete().in('source', ['beta', 'live'])
    await db.from('diocese_events').delete().eq('source', 'beta')
    await db.from('diocese_magazine_issues').delete().eq('source', 'beta')
    await db.from('diocese_pages').update({ parent_id: null }).eq('source', 'beta')
    await db.from('diocese_pages').delete().eq('source', 'beta')
  }
  const { data: cats, error: ce } = await db.from('diocese_post_categories').upsert(CATEGORIES.map((c, i) => ({ slug: c.slug, name: c.name, sort_order: (i + 1) * 10 })), { onConflict: 'slug' }).select('id, slug')
  if (ce) throw ce
  const catId = new Map((cats ?? []).map((c) => [c.slug, c.id as string]))

  // stránky: najprv bez rodiča, potom väzby (rodič môže byť vložený neskôr)
  for (let i = 0; i < pages.length; i += 50) {
    const { error } = await db.from('diocese_pages').insert(pages.slice(i, i + 50).map((p) => ({ ...p, parent_id: null })))
    if (error) throw error
  }
  for (const p of pages.filter((p) => p.parent_id)) await db.from('diocese_pages').update({ parent_id: p.parent_id }).eq('id', p.id)

  for (let i = 0; i < posts.length; i += 50) {
    const batch = posts.slice(i, i + 50)
    const { error } = await db.from('diocese_posts').insert(batch.map(({ categories: _c, ...p }) => p))
    if (error) throw error
    const links = batch.flatMap((p) => p.categories.map((c) => catId.get(c)).filter(Boolean).map((cid) => ({ post_id: p.id, category_id: cid })))
    if (links.length) await db.from('diocese_post_category_links').insert(links)
  }
  if (events.length) await db.from('diocese_events').insert(events)
  if (magazine.length) await db.from('diocese_magazine_issues').insert(magazine)

  // presmerovania starých adries živého webu
  const redirects = posts.filter((p) => p.legacy_path).map((p) => ({ from_path: p.legacy_path!, to_path: `/aktuality/${p.slug}` }))
  for (let i = 0; i < redirects.length; i += 100) await db.from('diocese_redirects').upsert(redirects.slice(i, i + 100), { onConflict: 'from_path' })
  console.log(`\nZapísané. Presmerovaní: ${redirects.length}.`)
}
main().catch((e) => {
  writeFileSync(MEDIA_MAP, JSON.stringify(mediaMap))
  console.error(e)
  process.exit(1)
})
