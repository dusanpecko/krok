/**
 * Dva weby v jednej aplikácii (krok_navrh_farnosti.md § 20, D0): mojkrok.sk (fond KROK) a dcza.sk (diecéza).
 * Web sa vyberie podľa domény; mimo produkcie ho prepne cookie `krok_site` (/web/dieceza, /web/krok).
 * Bez serverových závislostí – používa ho middleware (edge) aj server.
 */

export type SiteKey = 'mojkrok' | 'dcza'

export const SITE_COOKIE = 'krok_site'
export const SITE_HEADER = 'x-krok-site'
/** Verejná cesta požiadavky (pred prepisom na /dcza/...) – pre canonical adresy. */
export const PATH_HEADER = 'x-krok-path'

const DCZA_HOSTS = ['dcza.sk', 'www.dcza.sk']

export function siteFromHost(host: string | null | undefined): SiteKey | null {
  const h = (host ?? '').toLowerCase().split(':')[0]
  if (DCZA_HOSTS.includes(h) || (process.env.DCZA_EXTRA_HOSTS ?? '').split(',').map((x) => x.trim()).filter(Boolean).includes(h)) return 'dcza'
  if (h === 'mojkrok.sk' || h === 'www.mojkrok.sk') return 'mojkrok'
  return null
}

/** Cesty spoločné pre oba weby (admin, prihlásenie, farnosti, kňazská zóna, sitemap, robots…) – na dcza.sk sa neprepisujú. */
const SHARED = /^\/(admin|api|auth|prihlasenie|nastavit-heslo|zabudnute-heslo|knazska-zona|moja-farnost|farnosti|web|_next|favicon\.ico|images|downloads|logo|lectio|sitemap\.xml|robots\.txt)(\/|$)/

export function isSharedPath(pathname: string): boolean {
  return SHARED.test(pathname)
}

export const SITE_LABEL: Record<SiteKey, string> = { mojkrok: 'mojkrok.sk', dcza: 'dcza.sk' }

/** Subdomény, ktoré nie sú farnosti (test.mojkrok.sk, beta.dcza.dev, pošta…). */
export const RESERVED_SUBDOMAINS = new Set(['www', 'test', 'beta', 'mail', 'mx', 'admin', 'api', 'app', 'dev', 'staging', 'ftp', 'smtp', 'webmail', 'autodiscover'])

/** Hlavné domény oboch webov (bez www); dcza.sk dopĺňa DCZA_EXTRA_HOSTS (napr. dcza.dev na stagingu). */
function siteBases(): { base: string; site: SiteKey }[] {
  const extra = (process.env.DCZA_EXTRA_HOSTS ?? '').split(',').map((x) => x.trim().toLowerCase()).filter((h) => h && !h.startsWith('www.'))
  return [{ base: 'mojkrok.sk', site: 'mojkrok' }, { base: 'dcza.sk', site: 'dcza' }, ...extra.map((base) => ({ base, site: 'dcza' as const }))]
}

/**
 * Subdoména farnosti z hostu (D5, § 4.4): „bela.mojkrok.sk“ → { sub: 'bela', site: 'mojkrok', base: 'mojkrok.sk' }.
 * Len jedna úroveň pod hlavnou doménou; rezervované názvy (www, test, beta…) nie sú farnosti.
 */
export function parishSubdomainFromHost(host: string | null | undefined): { sub: string; site: SiteKey; base: string } | null {
  const h = (host ?? '').toLowerCase().split(':')[0]
  for (const { base, site } of siteBases()) {
    if (!h.endsWith(`.${base}`)) continue
    const sub = h.slice(0, -base.length - 1)
    if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null
    return { sub, site, base }
  }
  return null
}
