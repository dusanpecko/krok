import type { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/mollie/client'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/moja-farnost', '/profil', '/api', '/auth', '/granty/dashboard', '/kontrolor'] },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  }
}
