import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getBaseUrl } from '@/lib/mollie/client'
import { getSitemapParishEntries } from '@/lib/parishes/public'

// Dáta sa menia priebežne (oznamy farností) – sitemap sa generuje pri každej požiadavke.
export const dynamic = 'force-dynamic'

const STATIC_PATHS = ['', '/o-nas', '/vyzvy', '/podporene-projekty', '/aktuality', '/farnosti', '/na-stiahnutie', '/kontakt', '/registracia']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl()
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const [{ data: projects }, { data: posts }, parishes] = await Promise.all([
    db.from('projects').select('slug, updated_at').eq('visible_on_web', true).not('slug', 'is', null),
    db.from('posts').select('slug, updated_at').eq('status', 'published'),
    getSitemapParishEntries(),
  ])

  return [
    ...STATIC_PATHS.map((p) => ({ url: `${base}${p}` })),
    ...(projects ?? []).map((p) => ({ url: `${base}/vyzvy/${p.slug}`, lastModified: p.updated_at ?? undefined })),
    ...(posts ?? []).map((p) => ({ url: `${base}/aktuality/${p.slug}`, lastModified: p.updated_at ?? undefined })),
    ...parishes.parishes.map((p) => ({ url: `${base}/farnosti/${p.slug}`, lastModified: p.updated_at ?? undefined, changeFrequency: 'weekly' as const })),
    ...parishes.posts.map((p) => ({
      url: `${base}/farnosti/${p.parishSlug}/${p.type === 'announcement' ? 'oznamy' : 'aktuality'}/${p.slug}`,
      lastModified: p.updated_at,
    })),
  ]
}
