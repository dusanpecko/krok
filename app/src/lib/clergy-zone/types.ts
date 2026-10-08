/**
 * Kňazská zóna (krok_navrh_farnosti.md § 15, O39–O42, O67–O69) – typy a pomocné funkcie
 * bez serverových závislostí (použiteľné aj na klientovi).
 */

export type DocStatus = 'current' | 'archived'

export interface ZoneCategory {
  id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
  is_visible: boolean
}

export interface ZoneFile {
  id: string
  file_name: string
  mime_type: string | null
  size_bytes: number
  has_text: boolean
}

export interface ZoneDocSummary {
  id: string
  category_id: string
  category_name: string
  category_slug: string
  title: string
  doc_number: string | null
  issued_on: string | null
  summary: string | null
  status: DocStatus
  published_at: string | null
  files: ZoneFile[]
}

export interface ZoneDoc extends ZoneDocSummary {
  body: string | null
}

export interface ZoneSearchHit extends ZoneDocSummary {
  /** úryvky s nájdeným slovom – pole častí, `hit` = zvýrazniť */
  snippets: { parts: { text: string; hit: boolean }[]; source: string }[]
}

/** Admin – dokument vrátane konceptu a stavu e-mailu */
export interface AdminZoneDoc extends ZoneDoc {
  published: boolean
  notified_at: string | null
  notified_count: number | null
  updated_at: string
}

export interface ZoneDocInput {
  id?: string
  category_id: string
  title: string
  doc_number?: string | null
  issued_on?: string | null
  summary?: string | null
  body?: string | null
  status: DocStatus
}

/** Dokument je „nový“ toľko dní od zverejnenia. */
export const NEW_DAYS = 30

export const isNewDoc = (publishedAt: string | null) => !!publishedAt && Date.now() - new Date(publishedAt).getTime() < NEW_DAYS * 86400000

/** Malé písmená bez diakritiky – znak po znaku, takže dĺžka a pozície ostanú rovnaké (úryvky). */
export function foldText(s: string): string {
  let out = ''
  for (const ch of s) {
    if (ch.length > 1) {
      out += ch
      continue
    }
    const base = ch.normalize('NFD')[0]
    const lower = base.toLowerCase()
    out += lower.length === 1 ? lower : base
  }
  return out
}

/** Slová hľadaného výrazu (bez diakritiky, min. 2 znaky). */
export function searchTerms(q: string): string[] {
  return Array.from(new Set(foldText(q).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2))).slice(0, 8)
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024)).toLocaleString('sk-SK')} kB`
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export function fileKind(name: string, mime: string | null): 'pdf' | 'word' | 'excel' | 'image' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf'
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'word'
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'excel'
  if (mime?.startsWith('image/')) return 'image'
  return 'other'
}

export const FILE_KIND_LABEL: Record<ReturnType<typeof fileKind>, string> = { pdf: 'PDF', word: 'Word', excel: 'Excel', image: 'Obrázok', other: 'Súbor' }

export const fmtDate = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '')

/** „1 dokument“, „3 dokumenty“, „7 dokumentov“ */
export function docCount(n: number): string {
  return `${n} ${n === 1 ? 'dokument' : n >= 2 && n <= 4 ? 'dokumenty' : 'dokumentov'}`
}
