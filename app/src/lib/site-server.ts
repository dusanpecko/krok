import { headers } from 'next/headers'
import { PATH_HEADER, SITE_HEADER, type SiteKey } from './site'
import { getBaseUrl } from '@/lib/mollie/client'

/** Na ktorom webe sa práve vykresľuje (nastavuje middleware). */
export async function getSite(): Promise<SiteKey> {
  return (await headers()).get(SITE_HEADER) === 'dcza' ? 'dcza' : 'mojkrok'
}

/** Verejná cesta požiadavky (na dcza.sk bez vnútorného /dcza), napr. „/aktuality/nieco“. */
export async function getPublicPath(): Promise<string> {
  return (await headers()).get(PATH_HEADER) || '/'
}

/** Verejná adresa webu bez lomky na konci. dcza.sk sa dá prepísať cez DCZA_BASE_URL. */
export function siteBaseUrl(site: SiteKey): string {
  if (site === 'dcza') return (process.env.DCZA_BASE_URL?.trim() || 'https://dcza.sk').replace(/\/+$/, '')
  return getBaseUrl()
}

/**
 * Hlavná adresa (canonical) stránok farností – O72: po spustení dcza.sk na Kroku sa prepne
 * na dcza.sk nastavením PARISH_CANONICAL_SITE=dcza; dovtedy ostáva mojkrok.sk.
 */
export function parishCanonicalSite(): SiteKey {
  return process.env.PARISH_CANONICAL_SITE === 'dcza' ? 'dcza' : 'mojkrok'
}

/** Registrácia darcu s predvyplnenou farnosťou – registrácia je len na mojkrok.sk. */
export async function parishSupportHref(slug: string): Promise<string> {
  const path = `/registracia?farnost=${encodeURIComponent(slug)}`
  return (await getSite()) === 'dcza' ? `${siteBaseUrl('mojkrok')}${path}` : path
}
