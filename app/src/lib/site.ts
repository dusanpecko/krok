/**
 * Dva weby v jednej aplikácii (krok_navrh_farnosti.md § 20, D0): mojkrok.sk (fond KROK) a dcza.sk (diecéza).
 * Web sa vyberie podľa domény; mimo produkcie ho prepne cookie `krok_site` (/web/dieceza, /web/krok).
 * Bez serverových závislostí – používa ho middleware (edge) aj server.
 */

export type SiteKey = 'mojkrok' | 'dcza'

export const SITE_COOKIE = 'krok_site'
export const SITE_HEADER = 'x-krok-site'

const DCZA_HOSTS = ['dcza.sk', 'www.dcza.sk']

export function siteFromHost(host: string | null | undefined): SiteKey | null {
  const h = (host ?? '').toLowerCase().split(':')[0]
  if (DCZA_HOSTS.includes(h) || (process.env.DCZA_EXTRA_HOSTS ?? '').split(',').map((x) => x.trim()).filter(Boolean).includes(h)) return 'dcza'
  if (h === 'mojkrok.sk' || h === 'www.mojkrok.sk') return 'mojkrok'
  return null
}

/** Cesty spoločné pre oba weby (admin, prihlásenie, farnosti, kňazská zóna…) – na dcza.sk sa neprepisujú. */
const SHARED = /^\/(admin|api|auth|prihlasenie|nastavit-heslo|zabudnute-heslo|knazska-zona|moja-farnost|farnosti|web|_next|favicon\.ico|images|downloads|logo)(\/|$)/

export function isSharedPath(pathname: string): boolean {
  return SHARED.test(pathname)
}

export const SITE_LABEL: Record<SiteKey, string> = { mojkrok: 'mojkrok.sk', dcza: 'dcza.sk' }
