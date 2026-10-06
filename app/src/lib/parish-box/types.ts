/**
 * E-zvonček farnosti (návrh § 12, O31–O38) – typy a výpočty bez prístupu k DB,
 * použiteľné na serveri aj na klientovi.
 */

export interface ParishBoxFees {
  mollie_fee_pct: number
  fund_fee_pct: number
}

export interface ParishBoxSettings extends ParishBoxFees {
  parish_id: string
  enabled: boolean
  title: string | null
  description: string | null
  enabled_at: string | null
  updated_at: string | null
}

/** Čo potrebuje verejná stránka farnosti */
export interface PublicParishBox {
  title: string
  description: string | null
}

export const DEFAULT_BOX_TITLE = 'Podporte našu farnosť'
export const BOX_PRESETS = [10, 20, 50, 100]

const round2 = (n: number) => Math.round(n * 100) / 100

/** Výpočet výplaty: poplatky sa počítajú z hrubej sumy a zaokrúhľujú na centy. */
export function computePayout(gross: number, fees: ParishBoxFees) {
  const g = round2(gross)
  const mollieFee = round2((g * fees.mollie_fee_pct) / 100)
  const fundFee = round2((g * fees.fund_fee_pct) / 100)
  return { gross: g, mollieFee, fundFee, net: round2(g - mollieFee - fundFee) }
}

/** '2026-10' → { start: '2026-10-01', end: '2026-11-01' } (koniec je exkluzívny) */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { start: `${month}-01`, end: `${next}-01` }
}

export function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
}

/** Normalizovaný IBAN (bez medzier, veľké písmená) a jednoduchá kontrola formátu SK/CZ/… */
export function normalizeIban(iban: string | null | undefined): string | null {
  const v = (iban ?? '').replace(/\s+/g, '').toUpperCase()
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v) ? v : null
}

/** Polnoc daného dňa v čase Bratislavy ako ISO reťazec s posunom (+01:00 v zime, +02:00 v lete). */
export function bratislavaMidnightIso(date: string): string {
  const probe = new Date(`${date}T12:00:00Z`)
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Bratislava', timeZoneName: 'shortOffset' })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const hours = Number(tz.replace('GMT', '') || '0')
  const sign = hours < 0 ? '-' : '+'
  return `${date}T00:00:00${sign}${String(Math.abs(hours)).padStart(2, '0')}:00`
}
