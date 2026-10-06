/**
 * Delenie polí farnosti (návrh farností § 3.6, O6) – jedna konštanta pre model aj UI.
 *  - PROTECTED: úradné údaje – farnosť ich môže len navrhnúť, schvaľuje diecéza
 *  - LIVE: prezentácia – farnosť ukladá hneď (s auditom)
 */
export const PROTECTED_PARISH_FIELDS = [
  'name', 'official_name', 'deanery_id', 'patrocinium', 'parish_code', 'ico', 'dic',
  'street', 'postal_code', 'city', 'district', 'phone', 'email', 'website', 'iban', 'administrator_name',
] as const
export type ProtectedParishField = (typeof PROTECTED_PARISH_FIELDS)[number]

export const LIVE_PARISH_FIELDS = ['intro', 'feast_day', 'feast_day_note', 'adoration_date', 'adoration_note', 'latitude', 'longitude', 'image_url', 'logo_url'] as const
export type LiveParishField = (typeof LIVE_PARISH_FIELDS)[number]

export const FIELD_LABEL: Record<string, string> = {
  name: 'Názov v Kroku', official_name: 'Oficiálny názov', deanery_id: 'Dekanát', patrocinium: 'Patrocínium / farský kostol',
  parish_code: 'Kód farnosti', ico: 'IČO', dic: 'DIČ', street: 'Ulica', postal_code: 'PSČ', city: 'Obec / pošta',
  district: 'Okres', phone: 'Telefón', email: 'E-mail', website: 'Web', iban: 'IBAN', administrator_name: 'Správca farnosti',
  intro: 'Text na web', feast_day: 'Hody', feast_day_note: 'Hody – poznámka', adoration_date: 'Výročná poklona',
  adoration_note: 'Výročná poklona – poznámka', latitude: 'GPS šírka', longitude: 'GPS dĺžka', image_url: 'Titulná fotka', logo_url: 'Erb / logo',
}

/** Normalizácia a kontrola hodnôt úradných údajov (admin úprava aj schválenie návrhu). */
export function normalizeParishValue(field: string, value: unknown): { value: unknown; error?: string } {
  if (value === undefined) return { value: undefined }
  if (value === null) return { value: null }
  if (typeof value === 'boolean' || typeof value === 'number') return { value }
  let v: string | null = String(value).trim()
  if (v === '') v = null
  if (v && field === 'iban') {
    v = v.replace(/\s+/g, '').toUpperCase()
    if (!/^SK\d{22}$/.test(v)) return { value: v, error: 'IBAN musí mať tvar SK + 22 číslic.' }
  }
  if (v && field === 'ico' && !/^\d{6,8}$/.test(v)) return { value: v, error: 'IČO musí mať 6–8 číslic.' }
  if (v && field === 'email') v = v.toLowerCase()
  if (v && (field === 'image_url' || field === 'logo_url') && !/^https:\/\//i.test(v)) return { value: v, error: 'Obrázok musí byť nahratý cez tlačidlo.' }
  if (v && (field === 'latitude' || field === 'longitude')) {
    const n = Number(v.replace(',', '.'))
    if (!Number.isFinite(n)) return { value: v, error: 'GPS súradnica musí byť číslo.' }
    return { value: n }
  }
  return { value: v }
}
