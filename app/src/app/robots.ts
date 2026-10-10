import type { MetadataRoute } from 'next'
import { getSite, siteBaseUrl } from '@/lib/site-server'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Testovacia verzia (vetva staging / preview) sa nesmie dostať do vyhľadávačov
  if (process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  // robots.txt podľa domény (mojkrok.sk / dcza.sk) – sitemap vždy z toho istého webu
  const site = await getSite()
  const disallow = ['/admin', '/moja-farnost', '/profil', '/api', '/auth', '/granty/dashboard', '/kontrolor', '/knazska-zona', ...(site === 'dcza' ? ['/hladat'] : [])]
  return {
    rules: { userAgent: '*', allow: '/', disallow },
    sitemap: `${siteBaseUrl(site)}/sitemap.xml`,
  }
}
