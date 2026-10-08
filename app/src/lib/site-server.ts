import { headers } from 'next/headers'
import { SITE_HEADER, type SiteKey } from './site'

/** Na ktorom webe sa práve vykresľuje (nastavuje middleware). */
export async function getSite(): Promise<SiteKey> {
  return (await headers()).get(SITE_HEADER) === 'dcza' ? 'dcza' : 'mojkrok'
}
