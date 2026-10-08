/**
 * D1 – stiahne obsah bety beta.dcza.dev cez verejné WordPress REST API (§ 20, O70):
 * stránky, články + kategórie, akcie, časopis a mapu médií → data/dcza/beta.json
 *
 *   npx tsx scripts/dcza/fetch-beta.ts
 */
import { writeFileSync } from 'node:fs'

const API = 'https://beta.dcza.dev/wp-json/wp/v2'

async function all<T>(type: string, fields?: string): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page < 50; page++) {
    const res = await fetch(`${API}/${type}?per_page=100&page=${page}${fields ? `&_fields=${fields}` : ''}`)
    if (!res.ok) break
    const rows = (await res.json()) as T[]
    out.push(...rows)
    if (rows.length < 100) break
  }
  return out
}

async function main() {
  const [pages, posts, categories, akcie, casopis, media] = await Promise.all([
    all('pages', 'id,slug,title,parent,link,menu_order,content,excerpt,featured_media,modified,status'),
    all('posts', 'id,slug,title,link,date,content,excerpt,categories,featured_media,status'),
    all('categories', 'id,slug,name,count,parent'),
    all('akcia', 'id,slug,title,link,date,content,meta,featured_media'),
    all('casopis', 'id,slug,title,date,content,meta'),
    all('media', 'id,source_url,mime_type,alt_text'),
  ])
  const data = { fetched_at: new Date().toISOString(), pages, posts, categories, akcie, casopis, media }
  writeFileSync('../data/dcza/beta.json', JSON.stringify(data))
  console.log(`stránky ${pages.length}, články ${posts.length}, kategórie ${categories.length}, akcie ${akcie.length}, časopis ${casopis.length}, médiá ${media.length}`)
}
main()
