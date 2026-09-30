/**
 * Čítanie PDF „Opis úhrad k prevodu“ od Slovenskej pošty (inkaso darov).
 * Riadok: „1. 9020611654 PAVLÍKOVÁ VERONA Čadca, SNP 58, 30 4,00“
 *          por.č.  EČP (10 číslic)  PLATITEĽ (veľkými)  adresa  suma
 */

export interface PostStatementRow {
  ecp: string
  /** Meno z PDF – „PRIEZVISKO MENO [TITUL]“ */
  name: string
  address: string
  amount: number
}

export interface PostStatement {
  rows: PostStatementRow[]
  /** Celková suma úhrad (súčet riadkov podľa PDF) */
  total: number | null
  /** Suma odmeny k zníženiu (kladné číslo) */
  fee: number | null
  /** Celkom suma po odčítaní (k úhrade) = suma, ktorá prišla na účet */
  net: number | null
  period: string | null
}

const num = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'))

const TITLES = /^(ING|MGR|BC|JUDR|MUDR|MVDR|PHDR|RNDR|PAEDDR|THDR|DOC|PROF|DR|PHD|CSC)\.?,?$/i

const TITLE_FORMS: Record<string, string> = {
  ING: 'Ing.', MGR: 'Mgr.', BC: 'Bc.', JUDR: 'JUDr.', MUDR: 'MUDr.', MVDR: 'MVDr.', PHDR: 'PhDr.',
  RNDR: 'RNDr.', PAEDDR: 'PaedDr.', THDR: 'ThDr.', DOC: 'doc.', PROF: 'prof.', DR: 'Dr.', PHD: 'PhD.', CSC: 'CSc.',
}

function isUpperWord(w: string): boolean {
  return /\p{L}/u.test(w) && w === w.toLocaleUpperCase('sk')
}

export function parsePostStatementText(text: string): PostStatement {
  // Bunky sa v PDF môžu zalomiť na viac riadkov – pracujeme so súvislým textom.
  const flat = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  const rows: PostStatementRow[] = []

  // Záznam „N. EČP … suma“; suma je posledné „d,dd“ pred ďalším záznamom, súčtom alebo pätou strany
  const next = String.raw`(?=\s+\d{1,4}\.\s+\d{10}\s|\s+Za |\s+Počet|\s+Por\.|\s+Slovensk|\s+\d+\s*\/\s*\d+\s|\s*$)`
  const re = new RegExp(String.raw`(?:^|\s)(\d{1,4})\.\s+(\d{10})\s+(.+?)\s+(\d{1,6},\d{2})` + next, 'g')
  for (const m of flat.matchAll(re)) {
    const words = m[3].trim().split(/\s+/)
    // Meno = úvodné slová VEĽKÝMI písmenami (vrátane titulu „MUDR.“), zvyšok = adresa
    let i = 0
    while (i < words.length && isUpperWord(words[i])) i++
    const name = words.slice(0, i).join(' ')
    const address = words.slice(i).join(' ').replace(/,\s*$/, '')
    rows.push({ ecp: m[2], name: name || m[3].trim(), address, amount: num(m[4]) })
  }

  const pick = (r: RegExp) => {
    const m = flat.match(r)
    return m ? Math.abs(num(m[1])) : null
  }
  const periodMatch = flat.match(/Obdobie\s*:\s*([0-9.\s-]+\d{4})/)

  return {
    rows,
    total: pick(/Celková suma úhrad\s*:?\s*(-?\d[\d\s]*,\d{2})/),
    fee: pick(/Suma odmeny k zníženiu\s*:?\s*(-?\d[\d\s]*,\d{2})/),
    net: pick(/k úhrade\)\s*:?\s*(-?\d[\d\s]*,\d{2})/),
    period: periodMatch ? periodMatch[1].replace(/\s+/g, ' ').trim() : null,
  }
}

/** „PAVLÍKOVÁ VERONA“ → { first: 'Verona', last: 'Pavlíková', titleBefore } (pošta uvádza priezvisko prvé). */
export function splitPostName(name: string): { first: string; last: string; titleBefore: string | null } {
  const words = name.split(/\s+/).filter(Boolean)
  const titles = words.filter((w) => TITLES.test(w))
  const rest = words.filter((w) => !TITLES.test(w))
  const cap = (w: string) => w.charAt(0).toLocaleUpperCase('sk') + w.slice(1).toLocaleLowerCase('sk')
  const last = rest[0] ? rest[0].split('-').map(cap).join('-') : ''
  const first = rest.slice(1).map(cap).join(' ')
  const titleBefore = titles.length
    ? titles.map((t) => TITLE_FORMS[t.replace(/[.,]/g, '').toUpperCase()] ?? t.replace(/,$/, '')).join(' ')
    : null
  return { first: first || last, last: first ? last : '', titleBefore }
}

/** „Čadca, SNP 58, 30“ → { city: 'Čadca', street: 'SNP 58, 30' } */
export function splitPostAddress(address: string): { city: string | null; street: string | null } {
  const [city, ...rest] = address.split(',').map((s) => s.trim())
  return { city: city || null, street: rest.filter(Boolean).join(', ') || null }
}

/** Server: text z PDF (unpdf – pdf.js bez natívnych závislostí). */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(data))
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join('\n') : text
}
