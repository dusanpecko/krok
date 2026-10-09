import type { DiocesePageNode } from './public'

/** Menu webu diecézy zo stromu stránok (§ 20, D2). Niektoré stránky bety nahrádzajú naše sekcie. */

export interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

/** stránky bety, ktoré vedú na dynamické sekcie Kroku */
const HREF_OVERRIDE: Record<string, string> = {
  aktuality: '/aktuality',
  'aktuality/clanky': '/aktuality',
  'aktuality/kalendar-akcii': '/kalendar',
  'aktuality/nasa-zilinska-dieceza': '/casopis',
  'kontakty/farnosti': '/farnosti',
  'o-nas/schematizmus/farnosti': '/farnosti',
  'cinnost/krok': 'https://mojkrok.sk',
  'o-nas/schematizmus': '/schematizmus/knazi',
  'cinnost/charita': 'https://www.charitaza.sk',
  'cinnost/lectio-divina': 'https://www.lectio.one',
  'dokumenty/homilie': '/aktuality?kategoria=homilie',
  'dokumenty/pastierske-listy': '/aktuality?kategoria=pastierske-listy',
}

export const pageHref = (path: string) => HREF_OVERRIDE[path] ?? `/${path}`

const toItem = (n: DiocesePageNode): NavItem => ({
  label: n.title,
  href: pageHref(n.path),
  children: n.children.filter((c) => c.show_in_menu).map(toItem),
})

/** Hlavné menu: poradie ako na bete, farnosti doplnené. */
const TOP_ORDER = ['o-nas', 'kuria', 'cinnost', 'aktuality', 'dokumenty', 'kontakty']

export function mainNav(tree: DiocesePageNode[]): NavItem[] {
  const roots = tree.filter((n) => n.show_in_menu && TOP_ORDER.includes(n.path)).sort((a, b) => TOP_ORDER.indexOf(a.path) - TOP_ORDER.indexOf(b.path))
  const items = roots.map(toItem)
  // Aktuality: pevné podsekcie (články, kalendár, časopis) namiesto prázdnych stránok bety
  const akt = items.find((i) => i.href === '/aktuality')
  if (akt)
    akt.children = [
      { label: 'Pozvánky', href: '/aktuality?kategoria=pozvanky' },
      { label: 'Zo života farností', href: '/aktuality?kategoria=zo-zivota-farnosti' },
      { label: 'Všetky aktuality', href: '/aktuality' },
      { label: 'Kalendár akcií', href: '/kalendar' },
      { label: 'Časopis Naša Žilinská diecéza', href: '/casopis' },
      { label: 'Galéria', href: '/galeria' },
    ]
  // Schematizmus z registra kňazov (K5) namiesto statických stránok bety
  const schema = items.flatMap((i) => i.children ?? []).find((c) => c.href === '/schematizmus/knazi')
  if (schema)
    schema.children = [
      { label: 'Kňazi a diakoni', href: '/schematizmus/knazi' },
      { label: 'Dekanáty', href: '/schematizmus/dekanaty' },
      { label: 'Farnosti', href: '/farnosti' },
      { label: 'Rehole', href: '/o-nas/schematizmus/rehole' },
      { label: 'Zomrelí kňazi', href: '/schematizmus/zomreli' },
    ]
  items.splice(Math.max(1, items.length - 1), 0, { label: 'Farnosti', href: '/farnosti' })
  return items
}

/** Cesta k stránke (omrvinky) a súrodenci/deti pre bočné menu. */
export function locate(tree: DiocesePageNode[], path: string): { trail: DiocesePageNode[]; section: DiocesePageNode | null } {
  const walk = (nodes: DiocesePageNode[], trail: DiocesePageNode[]): DiocesePageNode[] | null => {
    for (const n of nodes) {
      if (n.path === path) return [...trail, n]
      const r = walk(n.children, [...trail, n])
      if (r) return r
    }
    return null
  }
  const trail = walk(tree, []) ?? []
  return { trail, section: trail[0] ?? null }
}
