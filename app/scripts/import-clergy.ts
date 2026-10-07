/**
 * Import schematizmu kňazov z Excelu kúrie (data/KNAZI - ZOZNAM AKTUALNY.xlsx) + doplnenie
 * z verejného schematizmu dcza.sk (data/schematizmus-knazi.json – scripts/fetch-clergy-schematizmus.ts).
 * Návrh: krok_navrh_farnosti.md § 16 (rozhodnutia O44–O52).
 *
 *   npx tsx scripts/import-clergy.ts                    → dry-run: len report (nič nezapisuje)
 *   npx tsx scripts/import-clergy.ts --apply            → zápis do DB (po migrácii 043, register musí byť prázdny)
 *   npx tsx scripts/import-clergy.ts --apply --replace  → zmaže predošlý import (source = import-xlsx) a nahrá znova
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (z .env.local).
 * Report: data/import-clergy-report.csv (osobné údaje – data/ je mimo gitu).
 */
import fs from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'

const XLSX_PATH = path.resolve(__dirname, '../../data/KNAZI - ZOZNAM AKTUALNY.xlsx')
const SCHEMA_PATH = path.resolve(__dirname, '../../data/schematizmus-knazi.json')
const REPORT_PATH = path.resolve(__dirname, '../../data/import-clergy-report.csv')
const APPLY = process.argv.includes('--apply')
const REPLACE = process.argv.includes('--replace')
const SOURCE = 'import-xlsx'
/** Akademický rok, ku ktorému je vyplnený list „bohoslovci“ (hlavička „2025/2026 ročník“). */
const SEMINARY_SHEET_YEAR = 2025

// ---------------------------------------------------------------- report

type Issue = { list: string; row: number | string; name: string; kind: string; detail: string }
const issues: Issue[] = []
const issue = (list: string, row: number | string, name: string, kind: string, detail: string) => issues.push({ list, row, name, kind, detail })

// ---------------------------------------------------------------- pomocné

const fold = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const clean = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).replace(/\s+/g, ' ').trim()
  return s && s !== '-' && s !== 'xxx' ? s : null
}

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v == null) return null
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[] }
    if (o.richText) return o.richText.map((t) => t.text).join('')
    if (o.result !== undefined) return o.result
    if (o.text !== undefined) return o.text
    return null
  }
  return v
}

const iso = (y: number, m: number, d: number) => {
  if (y < 1900 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Dátum zo všetkých formátov v Exceli; { date } alebo { year } (len rok) alebo null. */
function parseDate(v: unknown): { date: string | null; year: number | null } | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return { date: v.toISOString().slice(0, 10), year: v.getUTCFullYear() }
  if (typeof v === 'number') {
    if (v >= 1900 && v <= 2035) return { date: null, year: v }
    if (v > 10000 && v < 60000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000))
      return { date: d.toISOString().slice(0, 10), year: d.getUTCFullYear() }
    }
    return null
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) { const d = iso(+m[1], +m[2], +m[3]); return d ? { date: d, year: +m[1] } : null }
  m = s.match(/^(\d{1,2})\.\s*(\d{1,2})[.,]\s*(\d{4})$/)
  if (m) { const d = iso(+m[3], +m[2], +m[1]); return d ? { date: d, year: +m[3] } : null }
  if (/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return { date: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()), year: d.getFullYear() }
  }
  m = s.match(/^(\d{4})$/)
  if (m) return { date: null, year: +m[1] }
  return null
}

/** Údaje, ktoré sa nezmestili do dátumového stĺpca (len rok, text) – pridajú sa do poznámky osoby. */
let pendingNotes: string[] = []
const IMPORTANT_DATES = new Set(['dátum narodenia', 'kňazská vysviacka', 'úmrtie'])
function dateField(list: string, row: number, name: string, label: string, v: unknown): string | null {
  if (v == null || clean(v) == null) return null
  const p = parseDate(v)
  if (!p) {
    if (IMPORTANT_DATES.has(label)) issue(list, row, name, 'dátum', `${label}: nečitateľné „${String(v).slice(0, 40)}“`)
    pendingNotes.push(`${label}: ${String(v).slice(0, 80)}`)
    return null
  }
  if (!p.date) {
    if (IMPORTANT_DATES.has(label)) issue(list, row, name, 'dátum', `${label}: len rok ${p.year} – deň a mesiac doplniť`)
    pendingNotes.push(`${label}: rok ${p.year}`)
  }
  return p.date
}

/** Tituly: „ICDr. PaedDr. - PhD.“ → pred: „ICDr. PaedDr.“, za: „PhD.“ */
const TITLE_RE = /(Dr\.\s?Theol\.|CsiLic\.|doc\.|prof\.|Mgr\.?|Ing\.?|Bc\.|ThLic\.|ICLic\.|PhLic\.|ThDr\.|ICDr\.|PaedDr\.|PhDr\.|JUDr\.|RNDr\.|MUDr\.|CSc\.|PhD\.?|Th\.\s?D\.|M\.\s?A\.|ArtD\.|CsiDr\.|MBA|STL|STD|SSL|JCL)/g
const AFTER = new Set(['PhD.', 'Th.D.', 'M.A.', 'CSc.', 'ArtD.', 'MBA'])
function splitTitles(list: string, row: number, name: string, raw: unknown): { before: string | null; after: string | null } {
  const s = clean(raw)
  if (!s) return { before: null, after: null }
  const tokens = [...s.matchAll(TITLE_RE)].map((m) => {
    let t = m[1].replace(/\s/g, '')
    if (/^(Mgr|Ing|PhD)$/.test(t)) t += '.'
    return t
  })
  if (!tokens.length) {
    if (!/honorárny|mons/i.test(s)) issue(list, row, name, 'titul', `akademický titul nerozpoznaný „${s}“`)
    return { before: null, after: null }
  }
  const before = [...new Set(tokens.filter((t) => !AFTER.has(t)))]
  const after = [...new Set(tokens.filter((t) => AFTER.has(t)))]
  return { before: before.join(' ') || null, after: after.join(', ') || null }
}

const ECCL_OK = /^(mons\.?|honorárny dekan|titulárny kanonik|honorárny kanonik|kanonik|biskup|mons\. biskup)$/i
function ecclesiasticalTitles(list: string, row: number, name: string, raw: unknown): string[] {
  const s = clean(raw)
  if (!s) return []
  const out: string[] = []
  for (const part of s.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (/\d/.test(part)) { issue(list, row, name, 'posun', `cirkevný titul obsahuje „${part}“ (dátum/telefón – posunutý stĺpec?)`); continue }
    if (/^dekan$/i.test(part)) continue // funkcia, nie titul
    if (/m\.?ss\.?cc/i.test(part)) continue // rehoľa
    if (!ECCL_OK.test(part)) issue(list, row, name, 'titul', `neznámy cirkevný titul „${part}“ – ponechaný`)
    out.push(/^mons/i.test(part) ? 'Mons.' : part.toLowerCase())
  }
  return [...new Set(out)]
}

function salutation(raw: unknown): string | null {
  const m = String(raw ?? '').trim().match(/^(Vsdp|Vdp|Dp|Mons)\./i)
  if (!m) return null
  const k = m[1].toLowerCase()
  return k === 'vsdp' ? 'Vsdp.' : k === 'vdp' ? 'Vdp.' : k === 'mons' ? 'Mons.' : 'Dp.'
}

const ORDERS: Record<string, string> = { SDB: 'SDB', OP: 'OP', OFMCAP: 'OFMCap', MS: 'MS', MSSCC: 'MSSCC', MCCSS: 'MSSCC', SVD: 'SVD', SJ: 'SJ', CM: 'CM', OFM: 'OFM' }
function orderCode(list: string, row: number, name: string, raw: unknown): string | null {
  const s = clean(raw)
  if (!s) return null
  const k = s.toUpperCase().replace(/[^A-Z]/g, '')
  if (ORDERS[k]) return ORDERS[k]
  issue(list, row, name, 'posun', `rehoľa „${s}“ nie je rehoľa – ignorované`)
  return null
}

const ORDAINERS: [RegExp, string, string][] = [
  [/korec/, 'Ján Chryzostom Korec', 'kardinál, nitriansky biskup'],
  [/galis/, 'Tomáš Galis', 'žilinský biskup'],
  [/rabek/, 'František Rábek', 'nitriansky / ordinár OS SR'],
  [/chovanec/, 'Marián Chovanec', 'pomocný / banskobystrický biskup'],
  [/gabris/, 'Július Gábriš', 'trnavský arcibiskup'],
  [/sokol/, 'Ján Sokol', 'trnavský / bratislavsko-trnavský arcibiskup'],
  [/balaz/, 'Rudolf Baláž', 'banskobystrický biskup'],
  [/lazik/, 'Ambróz Lazík', 'trnavský apoštolský administrátor'],
  [/feranec/, 'Jozef Feranec', 'banskobystrický biskup'],
  [/pasztor/, 'Ján Pásztor', 'nitriansky biskup'],
  [/judak/, 'Viliam Judák', 'nitriansky biskup'],
  [/tkac/, 'Alojz Tkáč', 'košický arcibiskup'],
  [/vrablec/, 'Štefan Vrablec', 'pomocný biskup'],
  [/tencer/, 'Dávid Tencer', 'reykjavický biskup'],
  [/macharski/, 'František Macharski', 'krakovský arcibiskup'],
  [/glemp/, 'Józef Glemp', 'varšavský arcibiskup'],
  [/trochta/, 'Štěpán Trochta', 'litoměřický biskup'],
  [/\bbeno\b/, 'Peter Beňo', ''],
]
function ordainer(list: string, row: number, name: string, raw: unknown): string | null {
  const s = clean(raw)
  if (!s) return null
  if (/^\d+$/.test(s) || /^\d{4}-/.test(s)) { issue(list, row, name, 'posun', `svätiteľ „${s}“ je číslo/dátum`); return null }
  const f = fold(s)
  for (const [re, canonical] of ORDAINERS) if (re.test(f)) return canonical
  return s.replace(/,\s*(pom\.\s*)?biskup.*$/i, '').replace(/^(Mons\.|S\. ?ex\.|arc\.)\s*/i, '').trim()
}

const LANG: Record<string, string> = { aj: 'en', ang: 'en', en: 'en', nj: 'de', de: 'de', tj: 'it', it: 'it', rj: 'ru', ru: 'ru', fj: 'fr', fr: 'fr', sj: 'es', šj: 'es', šp: 'es', sp: 'es', pl: 'pl', pj: 'pl', hindi: 'hi', konkani: 'kok', mj: 'hu', čj: 'cs', cj: 'cs' }
function languages(raw: unknown): string[] {
  const s = clean(raw)
  if (!s) return []
  const out = s
    .toLowerCase()
    .replace(/pasívne/g, '')
    .split(/[,;/\s]+/)
    .map((t) => t.replace(/\./g, ''))
    .filter(Boolean)
    .map((t) => LANG[t] ?? t)
  return [...new Set(out)]
}

function phones(raw: unknown): string[] {
  const s = clean(raw)
  if (!s) return []
  return s.split(/[;,]/).map((p) => p.trim()).filter((p) => (p.match(/\d/g) ?? []).length >= 6)
}

function nameDay(raw: unknown): string | null {
  const m = String(raw ?? '').trim().match(/^(\d{1,2})\.(\d{1,2})\.?$/)
  if (!m) return null
  const mm = +m[1], dd = +m[2]
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 ? `${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}` : null
}

const email = (raw: unknown) => {
  const s = clean(raw)?.toLowerCase() ?? null
  return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null
}

function slugify(s: string) {
  return fold(s).replace(/\s+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
}

// ---------------------------------------------------------------- typy

type Category = 'seminarian' | 'deacon' | 'permanent_deacon' | 'priest' | 'bishop'
type Status = 'active' | 'retired' | 'studying' | 'left' | 'deceased' | 'suspended'

interface Assignment {
  kind: 'parish' | 'deanery' | 'diocese' | 'other'
  role: string
  parish_id: string | null
  deanery_id: string | null
  organization: string | null
  date_from: string | null
  year_from: number | null
  year_to: number | null
  is_primary: boolean
  note: string | null
  source: string
}

interface Person {
  key: string
  list: string
  row: number
  rec: Record<string, unknown>
  assignments: Assignment[]
  diaconateOrdainer: string | null
  ordinationOrdainer: string | null
  order: string | null
}

// ---------------------------------------------------------------- hlavný beh

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Chýba NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, key)

  // --- referenčné dáta
  const [{ data: parishes }, { data: deaneries }, { data: parishClergy }] = await Promise.all([
    db.from('parishes').select('id, slug, name, official_name, city, deanery_id'),
    db.from('deaneries').select('id, name'),
    db.from('parish_clergy').select('id, full_name, parish_id, clergy_id'),
  ])
  const parishBy = new Map<string, { id: string; name: string; deanery_id: string | null }>()
  for (const p of parishes ?? []) {
    const add = (k: string | null) => { if (k && !parishBy.has(fold(k))) parishBy.set(fold(k), p) }
    add(p.slug?.replace(/-/g, ' ') ?? null)
    add(p.name)
    add(p.name?.replace(/^(Farnosť|Duchovná správa)\s+/i, '') ?? null)
    add(p.official_name?.replace(/^(Rímskokatolícka cirkev,?\s*)?(Farnosť|Duchovná správa)\s+/i, '') ?? null)
  }
  const parishSlug = new Map((parishes ?? []).map((p) => [p.slug, p]))
  const DEANERY_CODE: Record<string, string> = { BY: 'Bytča', CA: 'Čadca', IL: 'Ilava', KRASNO: 'Krásno nad Kysucou', KRA: 'Krásno nad Kysucou', KNM: 'Kysucké Nové Mesto', MT: 'Martin', PB: 'Považská Bystrica', PU: 'Púchov', RA: 'Rajec', TKA: 'Turzovka', VA: 'Varín', ZA: 'Žilina' }
  const deaneryByName = new Map((deaneries ?? []).map((d) => [d.name, d.id]))
  const deaneryId = (code: unknown) => {
    const c = fold(code).toUpperCase().replace(/\s/g, '')
    return c && DEANERY_CODE[c] ? deaneryByName.get(DEANERY_CODE[c]) ?? null : null
  }
  const isCuria = (code: unknown, parish: unknown) => /^bu$/i.test(fold(code)) || /biskupsk[yý] urad/.test(fold(parish))

  const findParish = (name: unknown) => {
    const f = fold(name)
    if (!f) return null
    return parishBy.get(f) ?? parishBy.get(f.replace(/^farnost /, '')) ?? null
  }

  // --- schematizmus dcza.sk
  type SP = { slug: string; heading: string; full_name: string | null; function: string | null; origin: string | null; diaconate: string | null; presbyterate: string | null; history: string[]; deanery: { slug: string } | null; parish: { slug: string; name: string } | null }
  const schema: SP[] = fs.existsSync(SCHEMA_PATH) ? JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')) : []
  if (!schema.length) console.warn('⚠ data/schematizmus-knazi.json chýba – spustite scripts/fetch-clergy-schematizmus.ts')
  const stripOrder = (s: string) => s.replace(/\b(SDB|OP|OFMCap|OFMCAP|SVD|MS|MSSCC|SJ|OFM|CM)\b\.?/gi, '').trim()
  const schemaBy = new Map<string, SP>()
  for (const e of schema) schemaBy.set(fold(stripOrder(e.heading.split(' - ')[0])), e)
  const usedSchema = new Set<string>()

  // --- Excel
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(XLSX_PATH)
  const people: Person[] = []
  const byName = new Map<string, Person>()

  /** Prijateľnosť riadku – koľko kontrolných stĺpcov má zmysluplnú hodnotu (na odhalenie posunu). */
  function plausibility(get: (col: string) => unknown): number {
    let score = 0
    const isDate = (v: unknown) => !!parseDate(v)?.date
    if (isDate(get('dat_nar'))) score += 2
    if (isDate(get('dat_ord'))) score += 2
    if (isDate(get('krst - dátum'))) score += 1
    if (isDate(get('diakonát'))) score += 1
    const tit = clean(get('titul akadem.'))
    if (tit && TITLE_RE.test(tit)) score += 1
    TITLE_RE.lastIndex = 0
    const nat = clean(get('národnosť'))
    if (nat && /^(slovensk|česk|poľ|pol|maď|tal|nem)/i.test(nat)) score += 1
    const sal = clean(get('Oslovenie'))
    if (sal && /^(Dp|Vdp|Vsdp|Mons)\./.test(sal)) score += 1
    return score
  }

  /** autoShift: v archívnych listoch sú niektoré riadky za priezviskom posunuté o 1–3 stĺpce. */
  function readSheet(name: string, headerRow = 1, autoShift = false) {
    const ws = wb.getWorksheet(name)
    if (!ws) throw new Error(`List ${name} chýba`)
    const head = (ws.getRow(headerRow).values as ExcelJS.CellValue[]).slice(1).map((h) => String(cellValue(h) ?? '').trim())
    const fixedUntil = head.findIndex((h) => h === 'priezvisko' || h === 'priezvisko ')
    const rows: { row: number; shift: number; get: (col: string, nth?: number) => unknown }[] = []
    ws.eachRow((r, i) => {
      if (i <= headerRow) return
      const vals = (r.values as ExcelJS.CellValue[]).slice(1).map(cellValue)
      const getter = (shift: number) => (col: string, nth = 0) => {
        let n = -1
        for (let k = 0; k < head.length; k++) {
          if (head[k] === col && ++n === nth) return vals[k <= fixedUntil ? k : k + shift] ?? null
        }
        return null
      }
      let shift = 0
      if (autoShift) {
        let best = plausibility(getter(0))
        for (const s of [1, -1, 2, -2, 3, -3]) {
          const sc = plausibility(getter(s))
          if (sc > best + 1) { best = sc; shift = s }
        }
      }
      rows.push({ row: i, shift, get: getter(shift) })
    })
    return rows
  }

  function addPerson(list: string, row: number, first: unknown, last: unknown): Person | null {
    const fn = clean(first), ln = clean(last)
    if (!fn || !ln || /^\d+$/.test(fn) || /ročník/i.test(fn)) return null
    const key = fold(`${ln} ${fn}`)
    if (byName.has(key)) {
      issue(list, row, `${fn} ${ln}`, 'duplicita', `meno už je v zozname „${byName.get(key)!.list}“ (riadok ${byName.get(key)!.row}) – preskočené`)
      return null
    }
    pendingNotes = []
    const p: Person = { key, list, row, rec: { first_name: fn, last_name: ln }, assignments: [], diaconateOrdainer: null, ordinationOrdainer: null, order: null }
    people.push(p)
    byName.set(key, p)
    return p
  }

  /** Doplnkové údaje bez vlastného stĺpca (len rok krstu, text v dátume…) → poznámka osoby */
  function flushNotes(p: Person, shift = 0) {
    const extra = [...pendingNotes]
    if (shift) extra.unshift(`riadok v Exceli bol posunutý o ${shift} stĺpec(-ce) – načítaný s korekciou, skontrolovať`)
    if (extra.length) p.rec.note = [p.rec.note, `Doplnkové údaje z Excelu: ${extra.join('; ')}`].filter(Boolean).join('\n')
    pendingNotes = []
  }

  /** Spoločné stĺpce listov kňazi / odišli / zomrelí / diakoni */
  function fillCommon(p: Person, r: ReturnType<typeof readSheet>[number], list: string, archive = false) {
    const nm = `${p.rec.first_name} ${p.rec.last_name}`
    const t = splitTitles(list, r.row, nm, r.get('titul akadem.'))
    Object.assign(p.rec, {
      title_before: t.before,
      title_after: t.after,
      ecclesiastical_titles: [
        ...new Set([
          ...ecclesiasticalTitles(list, r.row, nm, r.get('titul cirkevný')),
          ...(/honorárny dekan/i.test(String(r.get('titul akadem.') ?? '')) ? ['honorárny dekan'] : []),
          ...(/mons/i.test(String(r.get('titul akadem.') ?? '')) ? ['Mons.'] : []),
        ]),
      ],
      salutation: salutation(r.get('Oslovenie')),
      name_day: nameDay(r.get('meniny-mes.deň.')),
      birth_date: dateField(list, r.row, nm, 'dátum narodenia', r.get('dat_nar')),
      birth_place: clean(r.get('miesto_nar')),
      permanent_address: clean(r.get('Trvalý pobyt')),
      baptism_date: dateField(list, r.row, nm, 'krst', r.get('krst - dátum')),
      baptism_place: clean(r.get('krst - miesto')),
      confirmation_date: dateField(list, r.row, nm, 'birmovka', r.get('birm.-dát.')),
      confirmation_place: clean(r.get('birmovka - miesto')),
      education_secondary: clean(r.get('štúdium sš')),
      education_university: clean(r.get('štúdium vš')),
      theology_place: clean(r.get('miesto štúd. Teol.')),
      postgraduate: clean(r.get('postgrad. štúd')),
      education_other: clean(r.get('iné vzdelanie')),
      // archív: koncové stĺpce sú v Exceli nepravidelne posunuté – jazyky, svätitelia a rehoľa sa nenačítajú
      languages: archive ? [] : languages(r.get('cudz. Jaz.')),
      diaconate_date: dateField(list, r.row, nm, 'diakonát', r.get('diakonát')),
      ordination_date: dateField(list, r.row, nm, 'kňazská vysviacka', r.get('dat_ord')),
      in_diocese_from: dateField(list, r.row, nm, 'v ŽD od', r.get('v ŽD od')),
      in_diocese_to: dateField(list, r.row, nm, 'v ŽD do', r.get('v ŽD do')),
      work_email: email(r.get('pracovný e-mail')),
      private_email: email(r.get('e-mail')),
      phones: phones(r.get('mobil')),
    })
    // národnosť / štátna príslušnosť – posunuté stĺpce (dátumy) vyradiť
    const nat = clean(r.get('národnosť'))
    if (nat && /\d/.test(nat)) issue(list, r.row, nm, 'posun', `národnosť „${nat}“ je dátum`)
    else if (nat) p.rec.nationality = nat.charAt(0).toUpperCase() + nat.slice(1).toLowerCase()
    const cit = clean(r.get('štát.prísl.'))
    if (cit) p.rec.citizenship = /^(sr|slovensk)/i.test(cit) ? 'SK' : /^(pl|poľ|pol)/i.test(cit) ? 'PL' : /^(čr|česk)/i.test(cit) ? 'CZ' : /^it/i.test(cit) ? 'IT' : /^chorv/i.test(cit) ? 'HR' : /^ind/i.test(cit) ? 'IN' : /^hond/i.test(cit) ? 'HN' : (issue(list, r.row, nm, 'posun', `štátna príslušnosť „${cit}“`), null)
    const th = clean(r.get('teológia od-do'))
    const tm = th?.match(/(\d{4})\s*[-–]\s*(\d{4})/)
    if (tm) { p.rec.theology_from = +tm[1]; p.rec.theology_to = +tm[2] } else if (th) issue(list, r.row, nm, 'dátum', `teológia od–do „${th}“`)
    if (!archive) {
      p.diaconateOrdainer = ordainer(list, r.row, nm, r.get('diakonát - svätiteľ'))
      p.ordinationOrdainer = ordainer(list, r.row, nm, r.get('ord.-svätiteľ'))
      p.order = orderCode(list, r.row, nm, r.get('rehola') ?? r.get('rehoľa'))
    }
    const pn = clean(r.get('osob.č.'))
    if (pn && /^\d+$/.test(pn)) p.rec.personal_number = pn
    const other = clean(r.get('iné úlohy'))
    const posob = clean(r.get('pôsobenie'))
    const notes = [other && `Iné úlohy (Excel): ${other}`, posob && `Pôsobenie (Excel): ${posob}`, clean(r.get('e-mail farský')) && `Farský e-mail: ${clean(r.get('e-mail farský'))}`].filter(Boolean)
    if (notes.length) p.rec.note = notes.join('\n')
  }

  /** Aktuálne pôsobenie z Excelu (funkcia + farnosť + dekanát). */
  function currentAssignment(p: Person, r: ReturnType<typeof readSheet>[number], list: string) {
    const nm = `${p.rec.first_name} ${p.rec.last_name}`
    const func = clean(r.get('funkcia vo farnosti'))
    const farnost = clean(r.get('farnosť'))
    const dek = r.get('Dekanát')
    const since = parseDate(r.get('vo farn.od r.'))
    if (!func) return
    const parts = func.split(',').map((x) => x.trim()).filter(Boolean)
    let role = parts[0]
    if (/^(n\.\s?o\.?|na odpočinku)/i.test(role)) {
      p.rec.status = 'retired'
      const place = role.replace(/^(n\.\s?o\.?|na odpočinku)\s*[-–]?\s*/i, '').trim()
      if (place) p.rec.note = [p.rec.note, `Na odpočinku: ${place}`].filter(Boolean).join('\n')
      return
    }
    if (/diecézny biskup/i.test(role)) p.rec.category = 'bishop'
    if (/suspend/i.test(func) || /suspend/i.test(String(r.get('iné úlohy') ?? ''))) p.rec.status = 'suspended'
    const parish = findParish(farnost)
    const curia = isCuria(dek, farnost)
    if (farnost && !parish && !curia) issue(list, r.row, nm, 'farnosť', `„${farnost}“ sa nespárovala s registrom farností – uložené ako organizácia`)
    p.assignments.push({
      kind: parish ? 'parish' : curia ? 'diocese' : farnost ? 'other' : 'diocese',
      role: role.toLowerCase() === 'kaplán' ? 'farský vikár' : role,
      parish_id: parish?.id ?? null,
      deanery_id: parish?.deanery_id ?? deaneryId(dek),
      organization: parish ? null : curia ? 'Biskupský úrad' : farnost,
      date_from: null,
      year_from: since?.year ?? null,
      year_to: null,
      is_primary: true,
      note: null,
      source: 'excel',
    })
    for (const extra of parts.slice(1)) {
      if (/dekan/i.test(extra)) {
        const did = parish?.deanery_id ?? deaneryId(dek)
        p.assignments.push({ kind: 'deanery', role: 'dekan', parish_id: null, deanery_id: did, organization: null, date_from: null, year_from: null, year_to: null, is_primary: false, note: null, source: 'excel' })
      } else {
        p.assignments.push({ kind: 'diocese', role: extra, parish_id: null, deanery_id: null, organization: null, date_from: null, year_from: null, year_to: null, is_primary: false, note: null, source: 'excel' })
      }
    }
    if (dek && !deaneryId(dek) && !curia) issue(list, r.row, nm, 'dekanát', `neznámy dekanát „${dek}“`)
  }

  // ===== list kňazi
  for (const r of readSheet('kňazi')) {
    const p = addPerson('kňazi', r.row, r.get('meno'), r.get('priezvisko'))
    if (!p) continue
    p.rec.category = 'priest'
    p.rec.status = 'active'
    fillCommon(p, r, 'kňazi')
    currentAssignment(p, r, 'kňazi')
    flushNotes(p)
  }

  // ===== diakoni
  for (const r of readSheet('diakoni')) {
    const p = addPerson('diakoni', r.row, r.get('meno'), r.get('priezvisko'))
    if (!p) continue
    p.rec.category = /trvalý/i.test(String(r.get('funkcia vo farnosti') ?? '')) ? 'permanent_deacon' : 'deacon'
    p.rec.status = 'active'
    fillCommon(p, r, 'diakoni')
    const farnost = clean(r.get('farnosť'))
    const parish = findParish(farnost)
    flushNotes(p)
    if (farnost) p.assignments.push({ kind: parish ? 'parish' : 'other', role: String(r.get('funkcia vo farnosti') ?? 'diakon'), parish_id: parish?.id ?? null, deanery_id: parish?.deanery_id ?? deaneryId(r.get('Dekanát')), organization: parish ? null : farnost, date_from: null, year_from: parseDate(r.get('vo farn.od r.'))?.year ?? null, year_to: null, is_primary: true, note: null, source: 'excel' })
  }

  // ===== bohoslovci – len aktuálny ročník (prvý blok po hlavičke, O45)
  for (const r of readSheet('bohoslovci')) {
    if (/ročník/i.test(String(r.get('2025/2026 ročník') ?? '')) && clean(r.get('meno')) === 'meno') break
    const yearRaw = clean(r.get('2025/2026 ročník'))
    if (yearRaw && /ročník/.test(yearRaw)) break // ďalší blok (starší rok)
    const p = addPerson('bohoslovci', r.row, r.get('meno'), r.get('priezvisko'))
    if (!p) continue
    const n = /propedeut/i.test(yearRaw ?? '') ? 1 : Number((yearRaw ?? '').replace(/[^\d]/g, '')) || null
    if (!n) issue('bohoslovci', r.row, `${p.rec.first_name} ${p.rec.last_name}`, 'ročník', `ročník „${yearRaw}“ nerozpoznaný`)
    const nm = `${p.rec.first_name} ${p.rec.last_name}`
    const firstClean = String(p.rec.first_name).replace(/^(Bc\.|Mgr\.)\s*/i, '')
    if (firstClean !== p.rec.first_name) { p.rec.title_before = String(p.rec.first_name).match(/^(Bc\.|Mgr\.)/i)![1]; p.rec.first_name = firstClean }
    Object.assign(p.rec, {
      category: 'seminarian',
      status: 'active',
      seminary_entry_year: n ? SEMINARY_SHEET_YEAR - (n - 1) : null,
      seminary: clean(r.get('seminár')),
      birth_date: dateField('bohoslovci', r.row, nm, 'dátum narodenia', r.get('dat_nar')),
      phones: phones(r.get('mobil')),
      private_email: email(r.get('e-mail')),
      note: clean(r.get('farnosť')) ? `Domovská farnosť (Excel): ${clean(r.get('farnosť'))}` : null,
    })
    flushNotes(p)
  }

  // ===== študenti (kňazi na štúdiách)
  for (const r of readSheet('študenti')) {
    const p = addPerson('študenti', r.row, r.get('meno'), r.get('priezvisko'))
    if (!p) {
      // kňaz zo štúdia môže byť aj v liste kňazi – len zmeníme stav
      const k = fold(`${clean(r.get('priezvisko'))} ${clean(r.get('meno'))}`)
      const ex = byName.get(k)
      if (ex) { ex.rec.status = 'studying'; ex.rec.note = [ex.rec.note, `Štúdium (Excel): ${clean(r.get('Adresa')) ?? ''}`].filter(Boolean).join('\n') }
      continue
    }
    Object.assign(p.rec, { category: 'priest', status: 'studying', phones: phones(r.get('mobil')), private_email: email(r.get('e-mail')), note: `Štúdium – adresa: ${clean(r.get('Adresa')) ?? '—'}` })
  }

  // ===== odišli zo ŽD (archív, O44)
  for (const r of readSheet('odišli zo ŽD', 1, true)) {
    const p = addPerson('odišli', r.row, r.get('meno'), r.get('priezvisko'))
    if (!p) continue
    p.rec.category = /diakon/i.test(String(r.get('funkcia vo farnosti') ?? '')) ? 'deacon' : 'priest'
    p.rec.status = 'left'
    fillCommon(p, r, 'odišli', true)
    const func = clean(r.get('funkcia vo farnosti'))
    if (func && !/^\d+\.?$/.test(func)) p.rec.note = [p.rec.note, `Posledná funkcia (Excel): ${func}${clean(r.get('farnosť')) ? ', ' + clean(r.get('farnosť')) : ''}`].filter(Boolean).join('\n')
    else if (func) issue('odišli', r.row, `${p.rec.first_name} ${p.rec.last_name}`, 'posun', `funkcia „${func}“ – posunutý riadok`)
    flushNotes(p, r.shift)
  }

  // ===== zomrelí (archív, O44)
  for (const r of readSheet('zomrelí', 1, true)) {
    const p = addPerson('zomrelí', r.row, r.get('meno'), r.get('priezvisko'))
    if (!p) continue
    p.rec.category = 'priest'
    p.rec.status = 'deceased'
    fillCommon(p, r, 'zomrelí', true)
    const nm = `${p.rec.first_name} ${p.rec.last_name}`
    p.rec.death_date = dateField('zomrelí', r.row, nm, 'úmrtie', r.get('úmrtie'))
    if (!p.rec.birth_date) p.rec.birth_date = dateField('zomrelí', r.row, nm, 'narodený', r.get('narodený'))
    if (!p.rec.ordination_date) p.rec.ordination_date = dateField('zomrelí', r.row, nm, 'ord.', r.get('ord.'))
    const func = clean(r.get('funkcia vo farnosti'))
    if (func) p.rec.note = [p.rec.note, `Posledná funkcia (Excel): ${func}${clean(r.get('farnosť')) ? ', ' + clean(r.get('farnosť')) : ''}`].filter(Boolean).join('\n')
    flushNotes(p, r.shift)
  }

  // ===== doplnenie zo schematizmu dcza.sk
  const HIST_ROLES = ['farský administrátor', 'administrátor', 'farský vikár', 'kaplán', 'farár', 'výpomocný duchovný', 'duchovný správca', 'rektor kostola', 'špirituál', 'dekan']
  const placeDate = (s: string | null) => {
    if (!s) return { date: null as string | null, place: null as string | null }
    const [d, ...rest] = s.split(',')
    return { date: parseDate(d.trim())?.date ?? null, place: rest.join(',').trim() || null }
  }
  for (const p of people) {
    const e = schemaBy.get(p.key)
    if (!e) {
      if (p.rec.status === 'active' && p.rec.category === 'priest') issue(p.list, p.row, `${p.rec.first_name} ${p.rec.last_name}`, 'schematizmus', 'nenašiel sa na dcza.sk/schematizmus')
      continue
    }
    usedSchema.add(e.slug)
    p.rec.schematizmus_slug = e.slug
    p.rec.slug = e.slug
    p.rec.origin = e.origin
    const dia = placeDate(e.diaconate)
    const pre = placeDate(e.presbyterate)
    p.rec.diaconate_place = dia.place
    p.rec.ordination_place = pre.place
    if (!p.rec.diaconate_date && dia.date) p.rec.diaconate_date = dia.date
    if (!p.rec.ordination_date && pre.date) p.rec.ordination_date = pre.date
    if (pre.date && p.rec.ordination_date && pre.date !== p.rec.ordination_date) issue(p.list, p.row, `${p.rec.first_name} ${p.rec.last_name}`, 'nezhoda', `vysviacka Excel ${p.rec.ordination_date} × dcza.sk ${pre.date}`)

    const current = p.assignments.find((a) => a.is_primary)
    for (const h of e.history) {
      const m = h.match(/^(\d{4})(?:\s*[–-]\s*(\d{4}))?\s+(.+)$/)
      if (!m) {
        const since = h.match(/vo farnosti od roku:\s*(\d{4})(?:\s*do\s*(\d{4}))?/i)
        if (since && current && !current.year_from && !since[2]) current.year_from = +since[1]
        else if (!/^na odpočinku/i.test(h)) p.rec.note = [p.rec.note, `Zo schematizmu dcza.sk: ${h}`].filter(Boolean).join('\n')
        continue
      }
      const from = +m[1], to = m[2] ? +m[2] : null
      const text = m[3].trim()
      const role = HIST_ROLES.find((r) => text.toLowerCase().startsWith(r))
      const place = role ? text.slice(role.length).trim() : ''
      if (!role) {
        // tituly → cirkevné tituly; udalosti a vzdelanie → poznámka; ostatné = funkcia (rada, súd, úrad…)
        const titles = p.rec.ecclesiastical_titles as string[]
        if (/^(honorárny dekan|honorárny kanonik|titulárny kanonik|kanonik)/i.test(text)) { if (!titles.includes(text.toLowerCase())) titles.push(text.toLowerCase()); continue }
        if (/^monsignor|^mons\./i.test(text)) { if (!titles.includes('Mons.')) titles.push('Mons.'); continue }
        if (/^(inkardinovan|na odpočinku|vysviacka|diakonát|presbyterát|odchod|návrat|ThLic|ThDr|PhD|ICLic|ICDr|PaedDr|Mgr|štúdium|postgraduál)/i.test(text)) {
          p.rec.note = [p.rec.note, `Zo schematizmu dcza.sk: ${h}`].filter(Boolean).join('\n')
          continue
        }
      }
      const parish = role ? findParish(place) : null
      if (role && !to && current?.kind === 'parish' && (parish?.id === current.parish_id || !parish)) {
        // otvorený záznam = aktuálne pôsobenie z Excelu → len doplníme rok
        if (!current.year_from) current.year_from = from
        continue
      }
      p.assignments.push({
        kind: role ? (parish ? 'parish' : 'other') : 'diocese',
        role: role ? (role === 'kaplán' ? 'farský vikár' : role) : text,
        parish_id: parish?.id ?? null,
        deanery_id: parish?.deanery_id ?? null,
        organization: role && !parish ? place || null : null,
        date_from: null,
        year_from: from,
        // otvorené farské pôsobenie, ktoré už nie je aktuálne → koniec = začiatok aktuálneho
        year_to: to ?? (role && current ? current.year_from ?? from : null),
        is_primary: false,
        note: role && !to ? 'koniec doplnený odhadom (schematizmus bez roku konca)' : null,
        source: 'schematizmus',
      })
    }
  }
  for (const e of schema) if (!usedSchema.has(e.slug)) issue('dcza.sk', e.slug, e.heading, 'schematizmus', 'osoba zo schematizmu dcza.sk nie je v Exceli')

  // ===== osobné čísla – duplicity
  const pnSeen = new Map<string, Person>()
  for (const p of people) {
    const pn = p.rec.personal_number as string | undefined
    if (!pn) continue
    if (pnSeen.has(pn)) {
      issue(p.list, p.row, `${p.rec.first_name} ${p.rec.last_name}`, 'osobné číslo', `duplicitné č. ${pn} (aj ${pnSeen.get(pn)!.rec.first_name} ${pnSeen.get(pn)!.rec.last_name}) – vynechané`)
      delete p.rec.personal_number
    } else pnSeen.set(pn, p)
  }

  // ===== verejné slugy (O47) – ak nie je zo schematizmu: priezvisko-meno-funkcia
  const slugSeen = new Set<string>()
  for (const p of people) {
    let s = (p.rec.slug as string | undefined) ?? (['active', 'retired', 'studying'].includes(String(p.rec.status)) ? slugify(`${p.rec.last_name} ${p.rec.first_name} ${p.assignments.find((a) => a.is_primary)?.role ?? ''}`) : null)
    if (!s) continue
    let n = 2
    while (slugSeen.has(s)) s = `${s.replace(/-\d+$/, '')}-${n++}`
    slugSeen.add(s)
    p.rec.slug = s
  }

  // ===== súhrn
  const count = (f: (p: Person) => boolean) => people.filter(f).length
  console.log('\n=== Import schematizmu kňazov – ' + (APPLY ? 'ZÁPIS' : 'DRY-RUN'))
  console.log(`Osoby spolu: ${people.length}`)
  for (const [k, l] of [['priest', 'kňazi'], ['bishop', 'biskup'], ['deacon', 'diakoni'], ['permanent_deacon', 'trvalí diakoni'], ['seminarian', 'bohoslovci']] as const) {
    console.log(`  ${l}: ${count((p) => p.rec.category === k)}`)
  }
  for (const [k, l] of [['active', 'v službe'], ['retired', 'na odpočinku'], ['studying', 'štúdium'], ['suspended', 'suspendovaní'], ['left', 'odišli (archív)'], ['deceased', 'zomrelí (archív)']] as const) {
    console.log(`  stav ${l}: ${count((p) => p.rec.status === k)}`)
  }
  const asg = people.flatMap((p) => p.assignments)
  console.log(`Pôsobenia: ${asg.length} (aktuálne ${asg.filter((a) => a.year_to == null).length}, z farnosťou ${asg.filter((a) => a.parish_id).length}, zo schematizmu ${asg.filter((a) => a.source === 'schematizmus').length})`)
  const open = asg.filter((a) => a.year_to == null)
  const openBy: Record<string, number> = {}
  open.forEach((a) => (openBy[`${a.source}/${a.kind}`] = (openBy[`${a.source}/${a.kind}`] ?? 0) + 1))
  console.log('  aktuálne podľa zdroja/druhu:', Object.entries(openBy).map(([k, n]) => `${k} ${n}`).join(', '))
  const openRoles: Record<string, number> = {}
  open.filter((a) => a.source === 'schematizmus').forEach((a) => (openRoles[a.role.slice(0, 40)] = (openRoles[a.role.slice(0, 40)] ?? 0) + 1))
  console.log('  otvorené zo schematizmu (top):', Object.entries(openRoles).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join(' | '))
  console.log(`Spárované so schematizmom dcza.sk: ${usedSchema.size}/${schema.length}`)
  const kinds: Record<string, number> = {}
  issues.forEach((i) => (kinds[i.kind] = (kinds[i.kind] ?? 0) + 1))
  console.log(`Na kontrolu: ${issues.length} –`, Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '))

  const csv = ['list;riadok;meno;typ;detail', ...issues.map((i) => [i.list, i.row, i.name, i.kind, i.detail].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))].join('\n')
  fs.writeFileSync(REPORT_PATH, '﻿' + csv)
  console.log(`Report: ${path.relative(process.cwd(), REPORT_PATH)}`)

  if (!APPLY) {
    console.log('\nDry-run – nič sa nezapísalo. Na zápis spustiť s --apply.')
    return
  }

  // ===== ZÁPIS
  const { count: existing } = await db.from('clergy').select('id', { count: 'exact', head: true })
  if ((existing ?? 0) > 0) {
    if (!REPLACE) throw new Error(`Register už obsahuje ${existing} osôb – na nový import použite --replace`)
    const { error } = await db.from('clergy').delete().eq('source', SOURCE)
    if (error) throw new Error(`Zmazanie predošlého importu zlyhalo: ${error.message}`)
  }

  // číselníky
  const orderCodes = [...new Set(people.map((p) => p.order).filter(Boolean))] as string[]
  if (orderCodes.length) await db.from('religious_orders').upsert(orderCodes.map((code) => ({ code })), { onConflict: 'code', ignoreDuplicates: true })
  const { data: orders } = await db.from('religious_orders').select('id, code')
  const orderId = new Map((orders ?? []).map((o) => [o.code, o.id]))
  const ordNames = [...new Set(people.flatMap((p) => [p.diaconateOrdainer, p.ordinationOrdainer]).filter(Boolean))] as string[]
  const notes = new Map(ORDAINERS.map(([, n, note]) => [n, note]))
  if (ordNames.length) await db.from('ordainers').upsert(ordNames.map((name) => ({ name, note: notes.get(name) || null })), { onConflict: 'name', ignoreDuplicates: true })
  const { data: ords } = await db.from('ordainers').select('id, name')
  const ordId = new Map((ords ?? []).map((o) => [o.name, o.id]))

  let inserted = 0
  for (let i = 0; i < people.length; i += 50) {
    const batch = people.slice(i, i + 50)
    const { data, error } = await db
      .from('clergy')
      .insert(
        batch.map((p) => ({
          ...p.rec,
          // pri hromadnom zápise musia mať všetky riadky polia (inak sa pošle NULL do NOT NULL stĺpca)
          ecclesiastical_titles: (p.rec.ecclesiastical_titles as string[] | undefined) ?? [],
          languages: (p.rec.languages as string[] | undefined) ?? [],
          phones: (p.rec.phones as string[] | undefined) ?? [],
          religious_order_id: p.order ? orderId.get(p.order) ?? null : null,
          diaconate_ordainer_id: p.diaconateOrdainer ? ordId.get(p.diaconateOrdainer) ?? null : null,
          ordination_ordainer_id: p.ordinationOrdainer ? ordId.get(p.ordinationOrdainer) ?? null : null,
          source: SOURCE,
        }))
      )
      .select('id')
    if (error) throw new Error(`Zápis osôb zlyhal (dávka ${i / 50 + 1}): ${error.message}`)
    const asgRows = batch.flatMap((p, j) => p.assignments.map((a) => ({ ...a, clergy_id: data![j].id })))
    if (asgRows.length) {
      const { error: ae } = await db.from('clergy_assignments').insert(asgRows)
      if (ae) throw new Error(`Zápis pôsobení zlyhal: ${ae.message}`)
    }
    batch.forEach((p, j) => (p.rec.id = data![j].id))
    inserted += batch.length
  }

  // väzba kňazov farností (parish_clergy) na register
  let linked = 0
  for (const pc of parishClergy ?? []) {
    const p = byName.get(fold(stripOrder(pc.full_name)))
    if (!p?.rec.id) continue
    const { error } = await db.from('parish_clergy').update({ clergy_id: p.rec.id }).eq('id', pc.id)
    if (!error) linked++
  }

  await db.from('clergy_change_log').insert({ entity: 'import', action: 'import', changes: { file: path.basename(XLSX_PATH), persons: inserted, issues: issues.length } })
  console.log(`\nZapísané: ${inserted} osôb, prepojené parish_clergy: ${linked}/${parishClergy?.length ?? 0}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
