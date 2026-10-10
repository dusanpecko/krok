/** Pomoc – adresy návodov (bez serverových závislostí, používajú ich aj klientské komponenty). */

export type HelpZone = 'parish' | 'admin'

export const HELP_ZONE_LABEL: Record<HelpZone, string> = { parish: 'Zóna farnosti', admin: 'Administrácia' }

/** Kde sa návody zóny zobrazujú (zoznam a detail /…/pomoc/<slug>). */
export const HELP_BASE: Record<HelpZone, string> = { parish: '/moja-farnost/pomoc', admin: '/admin/pomoc' }

export const helpHref = (zone: HelpZone, slug?: string) => (slug ? `${HELP_BASE[zone]}/${slug}` : HELP_BASE[zone])

/**
 * Návod k stránke administrácie podľa adresy (odkaz „Návod k tejto stránke“ v admin layoute).
 * Poradie: konkrétnejšie cesty skôr. Slugy zodpovedajú návodom v migrácii 054.
 */
const ADMIN_HELP_ROUTES: [string, string][] = [
  ['/admin/farnosti/predpisy', 'predpisy-farnosti'],
  ['/admin/farnosti/schvalovanie', 'schvalovanie-navrhov'],
  ['/admin/farnosti/prispevky', 'prispevky-farnosti'],
  ['/admin/farnosti/sviatosti', 'sviatosti-dieceza'],
  ['/admin/farnosti/e-zvoncek', 'e-zvoncek-vyuctovanie'],
  ['/admin/farnosti', 'farnosti'],
  ['/admin/knazi/vyrocia', 'vyrocia-a-stitky'],
  ['/admin/knazi/stitky', 'vyrocia-a-stitky'],
  ['/admin/knazi/kuria', 'kuria-rady-a-komisie'],
  ['/admin/knazi', 'register-knazov'],
  ['/admin/knazska-zona', 'knazska-zona'],
  ['/admin/web-dieceza/casopis', 'web-dieceza-casopis-a-dokumenty'],
  ['/admin/web-dieceza/dokumenty', 'web-dieceza-casopis-a-dokumenty'],
  ['/admin/web-dieceza/galeria', 'web-dieceza-galeria'],
  ['/admin/web-dieceza', 'web-dieceza-aktuality'],
  ['/admin/darcovia', 'darcovia'],
  ['/admin/banka', 'banka-a-parovanie'],
  ['/admin/import', 'banka-a-parovanie'],
  ['/admin/platby', 'online-platby'],
  ['/admin/granty', 'granty'],
  ['/admin/projekty', 'vyzvy-a-projekty'],
  ['/admin/aktuality', 'web-krok-obsah'],
  ['/admin/podporene-projekty', 'web-krok-obsah'],
  ['/admin/na-stiahnutie', 'web-krok-obsah'],
  ['/admin/sponzori', 'web-krok-obsah'],
  ['/admin/emaily', 'emailove-sablony'],
  ['/admin/roly', 'roly-a-opravnenia'],
  ['/admin/nastavenia', 'nastavenia-a-dekanaty'],
]

export function adminHelpSlug(pathname: string): string | null {
  if (pathname === '/admin') return 'zaciname-v-administracii'
  if (pathname.startsWith('/admin/pomoc')) return null
  return ADMIN_HELP_ROUTES.find(([route]) => pathname === route || pathname.startsWith(route + '/'))?.[1] ?? null
}
