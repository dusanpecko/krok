/** Typy registra farností (migrácia 034) – zdieľané server aj klient. */
import type { SocialLink } from './social'

export type ParishKind = 'parish' | 'chaplaincy' | 'other'
export type ParishSeason = 'regular' | 'summer'
export type ParishOccasion = 'regular' | 'first_friday'
export type ParishServiceType = 'mass' | 'confession' | 'adoration' | 'devotion' | 'office' | 'other'

export const KIND_LABEL: Record<ParishKind, string> = {
  parish: 'Farnosť',
  chaplaincy: 'Duchovná správa',
  other: 'Iné',
}

export const SERVICE_LABEL: Record<ParishServiceType, string> = {
  mass: 'Sv. omša',
  confession: 'Spovedanie',
  adoration: 'Adorácia',
  devotion: 'Pobožnosť',
  office: 'Úradné hodiny',
  other: 'Iné',
}

/** 0 = nedeľa … 6 = sobota; poradie zobrazenia po → ne */
export const DAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Pondelok', short: 'Po' },
  { value: 2, label: 'Utorok', short: 'Ut' },
  { value: 3, label: 'Streda', short: 'St' },
  { value: 4, label: 'Štvrtok', short: 'Št' },
  { value: 5, label: 'Piatok', short: 'Pi' },
  { value: 6, label: 'Sobota', short: 'So' },
  { value: 0, label: 'Nedeľa', short: 'Ne' },
]

export interface ParishListItem {
  id: string
  name: string
  official_name: string | null
  slug: string | null
  kind: ParishKind
  deanery_id: string | null
  deanery_name: string | null
  parish_code: string | null
  city: string | null
  is_active: boolean
  visible_on_web: boolean
  administrator_name: string | null
  catholics: number | null
  villages_count: number
  donors_count: number
  collected_this_year: number
  prescribed_this_year: number | null
  missing: string[]
  updated_at: string | null
}

export interface ParishRow {
  id: string
  name: string
  official_name: string | null
  slug: string | null
  kind: ParishKind
  deanery_id: string | null
  patrocinium: string | null
  parish_code: string | null
  ico: string | null
  dic: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  district: string | null
  email: string | null
  phone: string | null
  website: string | null
  iban: string | null
  administrator_name: string | null
  feast_day: string | null
  feast_day_note: string | null
  adoration_date: string | null
  adoration_note: string | null
  schematizmus_url: string | null
  latitude: number | null
  longitude: number | null
  intro: string | null
  image_url: string | null
  logo_url: string | null
  social_links: SocialLink[]
  notes: string | null
  is_active: boolean
  visible_on_web: boolean
  updated_at: string | null
}

/** Polia základných údajov, ktoré admin upravuje (bez id / slug / časových pečiatok). */
export const PARISH_EDITABLE_FIELDS = [
  'name', 'official_name', 'kind', 'deanery_id', 'patrocinium', 'parish_code', 'ico', 'dic', 'street', 'postal_code',
  'city', 'district', 'email', 'phone', 'website', 'iban', 'administrator_name', 'feast_day', 'feast_day_note',
  'adoration_date', 'adoration_note', 'schematizmus_url', 'latitude', 'longitude', 'intro', 'notes', 'is_active', 'visible_on_web',
] as const
export type ParishEditableField = (typeof PARISH_EDITABLE_FIELDS)[number]

export interface VillageWithStats {
  id?: string
  name: string
  is_seat: boolean
  district: string | null
  church_name: string | null
  has_church: boolean
  population: number | null
  catholics: number | null
  source: string | null
}

export interface ScheduleItem {
  id?: string
  service_type: ParishServiceType
  occasion: ParishOccasion
  day_of_week: number | null
  day_label: string | null
  time_from: string | null
  time_to: string | null
  relative_note: string | null
  note: string | null
  village_id: string | null
}

export interface Schedule {
  season: ParishSeason
  is_active: boolean
  valid_from: string | null
  valid_to: string | null
  note: string | null
  items: ScheduleItem[]
}

export interface ClergyMember {
  id?: string
  full_name: string
  title_before: string | null
  title_after: string | null
  position: string
  phone: string | null
  email: string | null
  is_public: boolean
  source: string | null
}

export interface ParishYearSummary {
  year: number
  prescribed_amount: number | null
  donors_count: number
  donations_count: number
  collected_amount: number
  fulfillment_pct: number | null
}

export interface ParishChangeLogEntry {
  id: string
  action: string
  entity: string
  changes: Record<string, unknown> | null
  created_at: string
  user_email: string | null
}

export interface ParishDetail {
  parish: ParishRow
  villages: VillageWithStats[]
  schedules: Record<ParishSeason, Schedule>
  clergy: ClergyMember[]
  summary: ParishYearSummary[]
  donorsCount: number
  log: ParishChangeLogEntry[]
}
