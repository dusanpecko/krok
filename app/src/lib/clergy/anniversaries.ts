/**
 * Výročia a meniny kňazov (krok_navrh_farnosti.md § 16.5, fáza K2) – počítajú sa z dátumov v registri,
 * nič sa neprepisuje ručne (náhrada listov „výročia…“ v Exceli). Bez prístupu k DB.
 */

export type AnniversaryKind = 'ordination' | 'birth' | 'death' | 'name_day'

export interface AnniversaryPerson {
  id: string
  name: string
  role: string | null
  place: string | null
  status: string
  birth_date: string | null
  ordination_date: string | null
  death_date: string | null
  name_day: string | null
}

export interface Anniversary {
  kind: AnniversaryKind
  /** MM-DD v danom roku */
  day: string
  /** počet rokov (pri meninách null) */
  years: number | null
  /** výrazné jubileum (25, 50, 60… kňazstva; 50, 60, 70… veku) */
  major: boolean
  person: AnniversaryPerson
}

export const KIND_LABEL: Record<AnniversaryKind, string> = {
  ordination: 'Jubileum kňazstva',
  birth: 'Životné jubileum',
  death: 'Výročie úmrtia',
  name_day: 'Meniny',
}

const ORDINATION_MAJOR = new Set([25, 40, 50, 60, 65, 70])
const LIVING = new Set(['active', 'retired', 'studying'])

/** Kňazstvo: každých 5 rokov od 10.; život: každých 5 rokov od 40.; úmrtie: 1. a každých 5 rokov. */
export function computeAnniversaries(people: AnniversaryPerson[], year: number): Anniversary[] {
  const out: Anniversary[] = []
  for (const p of people) {
    const living = LIVING.has(p.status)
    if (living && p.ordination_date) {
      const n = year - Number(p.ordination_date.slice(0, 4))
      if (n >= 10 && n % 5 === 0) out.push({ kind: 'ordination', day: p.ordination_date.slice(5), years: n, major: ORDINATION_MAJOR.has(n), person: p })
    }
    if (living && p.birth_date) {
      const n = year - Number(p.birth_date.slice(0, 4))
      if (n >= 40 && n % 5 === 0) out.push({ kind: 'birth', day: p.birth_date.slice(5), years: n, major: n % 10 === 0 || n >= 75, person: p })
    }
    if (p.status === 'deceased' && p.death_date) {
      const n = year - Number(p.death_date.slice(0, 4))
      if (n === 1 || (n >= 5 && n % 5 === 0)) out.push({ kind: 'death', day: p.death_date.slice(5), years: n, major: n % 10 === 0, person: p })
    }
    if (living && p.name_day) out.push({ kind: 'name_day', day: p.name_day, years: null, major: false, person: p })
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || a.person.name.localeCompare(b.person.name, 'sk'))
}

export function dayLabel(mmdd: string): string {
  const [m, d] = mmdd.split('-').map(Number)
  return `${d}. ${m}.`
}

export const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']
