import { normalizeVs, isHistoricalPayment } from './legacy-project-vs'

/**
 * Rozpoznanie výzvy (projektu) k bankovej platbe – pre kontrolu v admine banky.
 *
 * Automatické párovanie (fio-sync / import) priraďuje výzvu podľa SS výzvy
 * alebo VS výzvy zo starého webu. Popis platby sa automaticky nepoužíva,
 * no darcovia tam často píšu názov („OATA“, „Lectio“…) – preto ho tu
 * vyhodnocujeme ako návrh, aby admin videl zlé / chýbajúce priradenie.
 */

export interface HintProject {
  id: string
  name: string
  specific_symbol: string | null
  legacy_variable_symbol: string | null
}

export type ProjectHintReason = 'ss' | 'vs' | 'text'

export interface ProjectHint {
  /** Výzva, ku ktorej je dar reálne zapísaný (donations.project_id) */
  assigned: { id: string; name: string } | null
  /** Čo naznačuje platba (SS > VS výzvy > popis) */
  detected: { id: string; name: string; reason: ProjectHintReason; keyword?: string } | null
  /** Priradenie nesedí s tým, čo naznačuje platba (alebo chýba) */
  mismatch: boolean
}


// Slová z názvov výzev, ktoré sú príliš všeobecné na rozpoznanie z popisu
const STOPWORDS = new Set([
  'rekonstrukcia', 'podpora', 'krok', 'moj', 'spolu', 'blizsie', 'projekt', 'vyzva',
  'pre', 'dar', 'fond', 'fondu', 'farnost', 'farnosti', 'nasa', 'vam',
])

function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Kľúčové slová výzvy z jej názvu (bez diakritiky, min. 4 znaky, bez všeobecných slov). */
export function projectKeywords(name: string): string[] {
  return fold(name)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
}

export function computeProjectHint(
  tx: { booking_date?: string | null; variable_symbol?: string | null; specific_symbol?: string | null; remittance_info?: string | null },
  projects: HintProject[],
  assignedProjectId: string | null
): ProjectHint {
  const byId = new Map(projects.map((p) => [p.id, p]))
  const assignedP = assignedProjectId ? byId.get(assignedProjectId) : undefined
  const assigned = assignedP ? { id: assignedP.id, name: assignedP.name } : null

  let detected: ProjectHint['detected'] = null

  const ss = (tx.specific_symbol || '').trim()
  if (ss) {
    const p = projects.find((x) => x.specific_symbol && x.specific_symbol === ss)
    if (p) detected = { id: p.id, name: p.name, reason: 'ss' }
  }

  if (!detected) {
    const vs = normalizeVs(tx.variable_symbol)
    if (vs) {
      const p = projects.find((x) => x.legacy_variable_symbol && normalizeVs(x.legacy_variable_symbol) === vs)
      if (p) detected = { id: p.id, name: p.name, reason: 'vs' }
    }
  }

  if (!detected && tx.remittance_info) {
    const text = fold(tx.remittance_info)
    for (const p of projects) {
      const kw = projectKeywords(p.name).find((k) => new RegExp(`\\b${k}`).test(text))
      if (kw) {
        detected = { id: p.id, name: p.name, reason: 'text', keyword: kw }
        break
      }
    }
  }

  // Staré dary bez výzvy (Charita, Mládež) sú zarátané v legacy sume výzvy – nie je to chyba
  const legacyUnassigned = !assigned && isHistoricalPayment(tx.booking_date)
  const mismatch = !!detected && detected.id !== assigned?.id && !legacyUnassigned

  return { assigned, detected, mismatch }
}
