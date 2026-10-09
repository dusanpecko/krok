import { unstable_cache } from 'next/cache'

/** Správy TK KBS (Tlačová kancelária Konferencie biskupov Slovenska) z RSS – pás na úvode dcza.sk (O76). */

export interface TkkbsItem {
  title: string
  link: string
  date: string | null
  excerpt: string
}

const RSS = 'https://www.tkkbs.sk/rss/vsetky'

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

async function fetchTkkbs(): Promise<TkkbsItem[]> {
  try {
    const res = await fetch(RSS, { headers: { 'User-Agent': 'Mozilla/5.0 (dcza.sk)' }, signal: AbortSignal.timeout(6000), cache: 'no-store' })
    if (!res.ok) return []
    const xml = await res.text()
    return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
      .map((m) => {
        const tag = (t: string) => m[1].match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? ''
        const link = decode(tag('link'))
        const pub = tag('pubDate')
        const excerpt = decode(tag('description'))
        return { title: decode(tag('title')), link, date: pub ? new Date(pub).toISOString() : null, excerpt: excerpt.length > 180 ? `${excerpt.slice(0, 179).trimEnd()}…` : excerpt }
      })
      .filter((i) => i.title && /^https:\/\/(www\.)?tkkbs\.sk\//.test(i.link))
  } catch {
    return []
  }
}

/** Posledné správy – v pamäti 30 minút; pri výpadku tkkbs.sk sa pás jednoducho nezobrazí. */
export const getTkkbsNews = unstable_cache(fetchTkkbs, ['tkkbs-rss'], { revalidate: 1800 })
