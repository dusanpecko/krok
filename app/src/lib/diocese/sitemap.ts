import type { MetadataRoute } from 'next'
import { dioceseDb } from './public'
import { pageHref } from './nav'
import { listPublicClergy } from './schematizmus'

/** Pevné sekcie webu diecézy (dynamické stránky Kroku, nie strom stránok). */
const STATIC_PATHS = ['', '/aktuality', '/kalendar', '/casopis', '/galeria', '/schematizmus/knazi', '/schematizmus/dekanaty', '/schematizmus/kuria', '/schematizmus/zomreli', '/dokumenty/dokumenty-papezov']

/** Sitemap dcza.sk (§ 20, D2) – stránky, články, akcie, albumy a profily kňazov. Farnosti pridáva volajúci podľa canonical (O72). */
export async function dioceseSitemap(base: string): Promise<MetadataRoute.Sitemap> {
  const db = dioceseDb()
  const now = new Date().toISOString()
  const [{ data: pages }, { data: posts }, { data: events }, { data: albums }, clergy] = await Promise.all([
    db.from('diocese_pages').select('path, updated_at').eq('published', true),
    db.from('diocese_posts').select('slug, updated_at').eq('published', true).lte('published_at', now),
    db.from('diocese_events').select('slug, updated_at').eq('published', true),
    db.from('diocese_albums').select('slug, updated_at').eq('published', true),
    listPublicClergy(),
  ])
  return [
    ...STATIC_PATHS.map((p) => ({ url: `${base}${p}` })),
    // stránky, ktoré menu presmeruje inam (aktuality, externé weby…), do sitemap nepatria
    ...(pages ?? []).filter((p) => pageHref(p.path) === `/${p.path}`).map((p) => ({ url: `${base}/${p.path}`, lastModified: p.updated_at ?? undefined })),
    ...(posts ?? []).map((p) => ({ url: `${base}/aktuality/${p.slug}`, lastModified: p.updated_at ?? undefined })),
    ...(events ?? []).map((e) => ({ url: `${base}/kalendar/${e.slug}`, lastModified: e.updated_at ?? undefined })),
    ...(albums ?? []).map((a) => ({ url: `${base}/galeria/${a.slug}`, lastModified: a.updated_at ?? undefined })),
    ...clergy.map((c) => ({ url: `${base}/schematizmus/knazi/${c.slug}` })),
  ]
}
