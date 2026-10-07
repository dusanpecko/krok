/**
 * Schematizmus kňazov (krok_navrh_farnosti.md § 16) – typy, popisy a farby stavov.
 * Bez prístupu k DB, použiteľné na serveri aj na klientovi.
 */

export type ClergyCategory = 'seminarian' | 'deacon' | 'permanent_deacon' | 'priest' | 'bishop'
export type ClergyStatus = 'active' | 'retired' | 'studying' | 'left' | 'deceased' | 'suspended'
export type AssignmentKind = 'parish' | 'deanery' | 'diocese' | 'other'

export const CATEGORY_LABEL: Record<ClergyCategory, string> = {
  seminarian: 'bohoslovec',
  deacon: 'diakon',
  permanent_deacon: 'trvalý diakon',
  priest: 'kňaz',
  bishop: 'biskup',
}

export const STATUS_LABEL: Record<ClergyStatus, string> = {
  active: 'v službe',
  retired: 'na odpočinku',
  studying: 'štúdium',
  left: 'odišiel zo ŽD',
  deceased: 'zomrel',
  suspended: 'suspendovaný',
}

export const KIND_LABEL: Record<AssignmentKind, string> = {
  parish: 'farnosť',
  deanery: 'dekanát',
  diocese: 'diecéza',
  other: 'iné',
}

/** Najčastejšie funkcie – návrhy v „Novom menovaní“ (dá sa napísať aj iná). */
export const ROLE_SUGGESTIONS = [
  'farár',
  'farský administrátor',
  'farský vikár',
  'výpomocný duchovný',
  'duchovný správca',
  'rektor kostola',
  'špirituál',
  'dekan',
  'generálny vikár',
  'súdny vikár',
  'kancelár',
  'člen kňazskej rady',
  'člen kolégia konzultorov',
]

/**
 * Farba stavu v zozname (O45): bohoslovci, diakoni, farský vikár (kaplán), farár/administrátor,
 * ostatní kňazi v službe, na odpočinku, archív.
 */
export type Tone = 'seminarian' | 'deacon' | 'vicar' | 'pastor' | 'priest' | 'retired' | 'archive' | 'warning'

export const TONE_CLASS: Record<Tone, { badge: string; row: string; label: string }> = {
  seminarian: { badge: 'bg-violet-100 text-violet-800 border-violet-200', row: 'bg-violet-50/40', label: 'bohoslovec' },
  deacon: { badge: 'bg-sky-100 text-sky-800 border-sky-200', row: 'bg-sky-50/40', label: 'diakon' },
  vicar: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', row: 'bg-emerald-50/30', label: 'farský vikár' },
  pastor: { badge: 'bg-blue-100 text-blue-800 border-blue-200', row: '', label: 'farár / administrátor' },
  priest: { badge: 'bg-slate-100 text-slate-700 border-slate-200', row: '', label: 'kňaz v službe' },
  retired: { badge: 'bg-amber-100 text-amber-800 border-amber-200', row: 'bg-amber-50/40', label: 'na odpočinku / štúdium' },
  archive: { badge: 'bg-gray-100 text-gray-500 border-gray-200', row: 'bg-gray-50 text-gray-500', label: 'archív' },
  warning: { badge: 'bg-red-100 text-red-800 border-red-200', row: 'bg-red-50/40', label: 'suspendovaný' },
}

export function clergyTone(c: { category: ClergyCategory; status: ClergyStatus; primary_role?: string | null }): Tone {
  if (c.status === 'left' || c.status === 'deceased') return 'archive'
  if (c.status === 'suspended') return 'warning'
  if (c.status === 'retired' || c.status === 'studying') return 'retired'
  if (c.category === 'seminarian') return 'seminarian'
  if (c.category === 'deacon' || c.category === 'permanent_deacon') return 'deacon'
  const r = (c.primary_role ?? '').toLowerCase()
  if (r.includes('vikár') && !r.includes('generáln') && !r.includes('súdn')) return 'vicar'
  if (r.startsWith('farár') || r.includes('administrátor')) return 'pastor'
  return 'priest'
}

/** Aktuálny akademický rok (začína 1. 9.): v októbri 2026 → 2026 (= 2026/2027). */
export function currentAcademicYear(today = new Date()): number {
  return today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1
}

/** Ročník bohoslovca – zvyšuje sa sám k 1. 9. (O45); 1. ročník = propedeutický. */
export function seminaryYear(entryYear: number | null, offset = 0, today = new Date()): number | null {
  if (entryYear == null) return null
  return currentAcademicYear(today) - entryYear + 1 + offset
}

export function seminaryYearLabel(year: number | null): string {
  if (year == null) return '—'
  if (year <= 1) return 'propedeutický ročník'
  return `${year}. ročník`
}

/** „Mgr. Dušan Pecko, PhD.“ */
export function clergyDisplayName(c: { first_name: string; last_name: string; title_before?: string | null; title_after?: string | null }): string {
  return [c.title_before, `${c.first_name} ${c.last_name}`].filter(Boolean).join(' ') + (c.title_after ? `, ${c.title_after}` : '')
}

export interface ClergyListItem {
  id: string
  first_name: string
  last_name: string
  title_before: string | null
  title_after: string | null
  category: ClergyCategory
  status: ClergyStatus
  personal_number: string | null
  religious_order: string | null
  seminary_entry_year: number | null
  seminary_year_offset: number
  work_email: string | null
  phones: string[]
  /** hlavné aktuálne pôsobenie */
  primary_role: string | null
  primary_place: string | null
  primary_parish_id: string | null
  deanery_id: string | null
  deanery_name: string | null
}

export interface ClergyAssignment {
  id: string
  kind: AssignmentKind
  role: string
  parish_id: string | null
  parish_name: string | null
  deanery_id: string | null
  deanery_name: string | null
  organization: string | null
  date_from: string | null
  date_to: string | null
  year_from: number | null
  year_to: number | null
  is_primary: boolean
  note: string | null
  source: string | null
}

export function isCurrent(a: Pick<ClergyAssignment, 'date_to' | 'year_to'>): boolean {
  return !a.date_to && a.year_to == null
}

export function assignmentPeriod(a: Pick<ClergyAssignment, 'date_from' | 'date_to' | 'year_from' | 'year_to'>): string {
  const from = a.date_from ? new Date(a.date_from).toLocaleDateString('sk-SK') : a.year_from ? String(a.year_from) : ''
  const to = a.date_to ? new Date(a.date_to).toLocaleDateString('sk-SK') : a.year_to ? String(a.year_to) : ''
  if (!from && !to) return '—'
  if (!to) return `od ${from}`
  return from === to ? from : `${from} – ${to}`
}

/** Polia osoby, ktoré sa upravujú vo formulároch (všetko okrem id a technických stĺpcov). */
export const CLERGY_EDIT_FIELDS = [
  'personal_number', 'category', 'status', 'first_name', 'last_name', 'title_before', 'title_after', 'ecclesiastical_titles',
  'salutation', 'religious_order_id', 'seminary_entry_year', 'seminary_year_offset', 'seminary', 'origin', 'slug', 'name_day',
  'birth_date', 'birth_place', 'nationality', 'citizenship', 'permanent_address', 'baptism_date', 'baptism_place',
  'confirmation_date', 'confirmation_place', 'education_secondary', 'education_university', 'theology_from', 'theology_to',
  'theology_place', 'postgraduate', 'education_other', 'languages', 'diaconate_date', 'diaconate_place', 'diaconate_ordainer_id',
  'ordination_date', 'ordination_place', 'ordination_ordainer_id', 'in_diocese_from', 'in_diocese_to', 'death_date', 'death_place',
  'work_email', 'private_email', 'phones', 'note',
] as const
export type ClergyEditField = (typeof CLERGY_EDIT_FIELDS)[number]

export type ClergyRecord = { id: string; schematizmus_slug: string | null; photo_url: string | null; created_at: string; updated_at: string } & {
  [K in ClergyEditField]: K extends 'ecclesiastical_titles' | 'languages' | 'phones'
    ? string[]
    : K extends 'seminary_entry_year' | 'seminary_year_offset' | 'theology_from' | 'theology_to'
      ? number | null
      : string | null
}
