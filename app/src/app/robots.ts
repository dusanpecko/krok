import type { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/mollie/client'

export default function robots(): MetadataRoute.Robots {
  // Testovacia verzia (vetva staging / preview) sa nesmie dostať do vyhľadávačov
  if (process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/moja-farnost', '/profil', '/api', '/auth', '/granty/dashboard', '/kontrolor'] },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  }
}
