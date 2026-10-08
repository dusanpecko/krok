/**
 * Import registra farností zo súboru data/farnosti2.csv (export z FileMakeru).
 * Návrh: krok_navrh_farnosti.md § 2 a § 7.
 *
 *   npx tsx scripts/import-parishes.ts            → dry-run: len report (nič nezapisuje)
 *   npx tsx scripts/import-parishes.ts --apply    → zápis do DB (po migrácii 034)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (z .env.local).
 * Report: data/import-parishes-report.csv
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const CSV_PATH = path.resolve(__dirname, '../../data/farnosti2.csv')
const SCHEMATIZMUS_PATH = path.resolve(__dirname, '../../data/schematizmus.json')
const REPORT_PATH = path.resolve(__dirname, '../../data/import-parishes-report.csv')
const APPLY = process.argv.includes('--apply')

// ---------------------------------------------------------------- CSV

/** CSV z FileMakeru: oddeľovač čiarka, úvodzovky, riadky oddelené CR. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// Stĺpce (0-based) podľa rozhodnutí O12 a § 2
const COL = {
  deanery: 0, dic: 1, email: 2, name: 3, patrocinium: 4, feastDay: 5, ico: 6, city: 7, district: 8,
  code: 9, phone: 10, account: 11, street: 12, adoration: 13, website: 14,
  confessionFrom: 24, // 24–30 bežné (po–ne), 31–37 prvopiatkové (po–ne)
  village: 48, population: 49, catholics: 50,
} as const

const clean = (v: string | undefined) => {
  const s = (v ?? '').replace(/\u000b/g, ' ').replace(/\s+/g, ' ').trim()
  return !s || /^x+$/i.test(s) ? null : s
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^farnost\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()

const DEANERY_ALIASES: Record<string, string> = {
  pb: 'Považská Bystrica',
  knm: 'Kysucké Nové Mesto',
  tka: 'Turzovka',
  krasno: 'Krásno nad Kysucou',
}

const TEST_ICO = new Set(['11111111', '11111112', '11111113'])

function isChaplaincy(name: string) {
  return /^(duchovn[aá] spr[aá]va|pustov[nň]a)/i.test(name) || /\bUPC\b/.test(name)
}

/** „dd.mm.yyyy“ → „yyyy-mm-dd“ */
function parseDate(v: string | null): string | null {
  const m = v?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

/** Staré číslo účtu „[predčíslie-]číslo/kód banky“ → SK IBAN (mod 97). IBAN nechá tak. */
function toIban(v: string | null): { iban: string | null; raw: string | null } {
  if (!v) return { iban: null, raw: null }
  const compact = v.replace(/\s+/g, '').toUpperCase()
  if (/^SK\d{22}$/.test(compact)) return { iban: compact, raw: v }
  const m = compact.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/)
  if (!m) return { iban: null, raw: v }
  const bban = m[3] + (m[1] ?? '').padStart(6, '0') + m[2].padStart(10, '0')
  // SK = 28 20; kontrolné číslice = 98 − (bban + "282000") mod 97
  const numeric = bban + '282000'
  let rem = 0
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97
  const check = String(98 - rem).padStart(2, '0')
  return { iban: `SK${check}${bban}`, raw: v }
}

// ---------------------------------------------------------------- bohoslužby (spovedanie)

interface ScheduleItem {
  occasion: 'regular' | 'first_friday'
  day_of_week: number
  time_from: string | null
  time_to: string | null
  relative_note: string | null
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // stĺpce po–ne

function parseTimes(v: string): { from: string; to: string | null }[] | null {
  const t = (s: string) => {
    const m = s.match(/(\d{1,2})[.:](\d{2})/)
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
  }
  const parts = v.split(/;|,/).map((p) => p.trim()).filter(Boolean)
  const out: { from: string; to: string | null }[] = []
  for (const p of parts) {
    const [a, b] = p.replace(/hod\.?/gi, '').split(/\s*-\s*/)
    const from = t(a ?? '')
    if (!from) return null
    out.push({ from, to: b ? t(b) : null })
  }
  return out.length ? out : null
}

function parseConfession(row: string[]): ScheduleItem[] {
  const items: ScheduleItem[] = []
  for (let k = 0; k < 14; k++) {
    const v = clean(row[COL.confessionFrom + k])
    if (!v) continue
    const occasion = k < 7 ? 'regular' : 'first_friday'
    const day = DAY_ORDER[k % 7]
    const times = parseTimes(v)
    if (times) for (const t of times) items.push({ occasion, day_of_week: day, time_from: t.from, time_to: t.to, relative_note: null })
    else items.push({ occasion, day_of_week: day, time_from: null, time_to: null, relative_note: v })
  }
  return items
}

// ---------------------------------------------------------------- model

interface Village {
  name: string
  population: number | null
  catholics: number | null
  rowNo: number
}

interface ParishRecord {
  rowNo: number
  kind: 'parish' | 'chaplaincy'
  name: string
  deaneryRaw: string | null
  deaneryName: string | null
  patrocinium: string | null
  feast_day: string | null
  adoration_date: string | null
  ico: string | null
  dic: string | null
  email: string | null
  city: string | null
  district: string | null
  parish_code: string | null
  phone: string | null
  iban: string | null
  account_raw: string | null
  street: string | null
  website: string | null
  villages: Village[]
  confession: ScheduleItem[]
  issues: string[]
}

const toInt = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null)

/**
 * Ručné opravy posunutých riadkov CSV (§ 2): obce pod „Trnové“ (riadky 181–185) patria farnosti
 * Turany (riadok 186, ktorá obce nemá). Považské Podhradie má namiesto obce „1600“ – vynechať.
 */
const VILLAGE_ROW_OWNER: Record<number, string> = { 181: 'Turany', 182: 'Turany', 183: 'Turany', 184: 'Turany', 185: 'Turany' }
const IGNORE_VILLAGE_ROWS = new Set([127])

/** CSV názov → slug schematizmu, keď sa názvy líšia (duchovné správy, Solinky, Svrčinovec) */
const CSV_TO_SLUG: Record<string, string> = {
  'dobreho pastiera zilina solinky': 'zilina-solinky-farnost-dobreho-pastiera',
  svrcinovec: 'svrcinovec-farnost-sv-cyrila-a-metoda',
  'zilina upc': 'duchovna-sprava-univerzitneho-pastoracneho-centra-pri-zilinskej-univerzite',
  'duchovna sprava kostola sv barbory': 'duchovna-sprava-kostola-sv-barbory-v-ziline',
  'duchovna sprava cadca nsp': 'duchovna-sprava-pre-nemocnicu-s-poliklinikou-v-cadci',
  'duchovna sprava univerzitnej nemocnice v martine': 'duchovna-sprava-univerzitnej-nemocnice-v-martine',
  'duchovna sprava fakultnej nsp v ziline': 'duchovna-sprava-pre-fakultnu-nemocnicu-s-poliklinikou-v-ziline',
}

/** Pseudo-farnosti (§ 2, O19, O22): projekt do donor_projects; pri daroch len kde `donations` = true */
const PSEUDO: Record<string, { project: string | null; donations: boolean }> = {
  'Lectio divina': { project: 'lectio-divina', donations: true },
  'Dve percenta': { project: 'dve-percenta', donations: true },
  Charita: { project: 's-farskou-charitou-blizsie-k-vam', donations: false },
  Rodinkovo: { project: null, donations: false },
}

const ENTITIES: Record<string, string> = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', yacute: 'ý', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Yacute: 'Ý', auml: 'ä', ocirc: 'ô', ndash: '–', mdash: '—', bdquo: '„', ldquo: '“', rdquo: '”', nbsp: ' ', amp: '&', quot: '"', apos: "'" }
const decodeEntities = (s: string) =>
  s.replace(/&(#\d+|[a-zA-Z]+);/g, (m, e: string) => (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : ENTITIES[e] ?? m))

/** Kľúč schematizmu pre CSV / DB názov */
const slugKey = (name: string) => fold(name).replace(/\bfarnost\b/g, '').replace(/\bkatedrala\b/g, '').replace(/\s+/g, ' ').trim()

function buildRecords(rows: string[][]): { records: ParishRecord[]; skipped: string[] } {
  const records: ParishRecord[] = []
  const skipped: string[] = []
  const pendingVillages: { owner: string; village: Village }[] = []
  let current: ParishRecord | null = null

  rows.forEach((r, i) => {
    const rowNo = i + 1
    const name = clean(r[COL.name])
    const village = clean(r[COL.village])
    if (name) {
      const ico = clean(r[COL.ico])
      if (ico && TEST_ICO.has(ico)) {
        skipped.push(`riadok ${rowNo}: testovací záznam „${name}“`)
        current = null
        return
      }
      const deaneryRaw = clean(r[COL.deanery])
      const alias = deaneryRaw ? DEANERY_ALIASES[fold(deaneryRaw)] : undefined
      const { iban, raw } = toIban(clean(r[COL.account]))
      const website = clean(r[COL.website])
      current = {
        rowNo,
        kind: isChaplaincy(name) ? 'chaplaincy' : 'parish',
        name,
        deaneryRaw,
        deaneryName: alias ?? deaneryRaw,
        patrocinium: clean(r[COL.patrocinium]),
        feast_day: parseDate(clean(r[COL.feastDay])),
        adoration_date: parseDate(clean(r[COL.adoration])),
        ico,
        dic: clean(r[COL.dic]),
        email: clean(r[COL.email])?.toLowerCase() ?? null,
        city: clean(r[COL.city]),
        district: clean(r[COL.district]),
        parish_code: clean(r[COL.code]),
        phone: clean(r[COL.phone]),
        iban,
        account_raw: raw,
        street: clean(r[COL.street]),
        website: website ? website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : null,
        villages: [],
        confession: parseConfession(r),
        issues: [],
      }
      if (raw && !iban) current.issues.push(`účet „${raw}“ sa nepodarilo previesť na IBAN`)
      records.push(current)
    }
    if (village && !IGNORE_VILLAGE_ROWS.has(rowNo)) {
      const ownerName = VILLAGE_ROW_OWNER[rowNo]
      if (ownerName) {
        // posunutý riadok – obec patrí inej farnosti (doplní sa v main podľa mena)
        pendingVillages.push({ owner: ownerName, village: { name: village, population: toInt(clean(r[COL.population])), catholics: toInt(clean(r[COL.catholics])), rowNo } })
        return
      }
      if (!current) {
        skipped.push(`riadok ${rowNo}: obec „${village}“ bez farnosti`)
        return
      }
      if (/^\d+$/.test(village)) current.issues.push(`obec „${village}“ je číslo (riadok ${rowNo}) – skontrolovať`)
      current.villages.push({ name: village, population: toInt(clean(r[COL.population])), catholics: toInt(clean(r[COL.catholics])), rowNo })
    }
  })
  for (const pv of pendingVillages) {
    const owner = records.find((r) => fold(r.name) === fold(pv.owner))
    if (owner) owner.villages.push(pv.village)
    else skipped.push(`riadok ${pv.village.rowNo}: obec „${pv.village.name}“ – farnosť ${pv.owner} sa nenašla`)
  }
  return { records, skipped }
}

// ---------------------------------------------------------------- main

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Chýba NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, key)

  const { records, skipped } = buildRecords(parseCsv(fs.readFileSync(CSV_PATH, 'utf8')))

  const [{ data: deaneries }, { data: parishes }] = await Promise.all([
    db.from('deaneries').select('id, name'),
    db.from('parishes').select('id, name'),
  ])
  const deaneryByFold = new Map((deaneries ?? []).map((d) => [fold(d.name), d]))
  const dbByFold = new Map((parishes ?? []).map((p) => [fold(p.name), p]))

  // Duplicitné názvy v CSV (napr. Makov)
  const seen = new Map<string, ParishRecord>()
  for (const r of records) {
    const k = fold(r.name)
    const prev = seen.get(k)
    if (prev) {
      r.issues.push(`duplicita s riadkom ${prev.rowNo} (IČO ${prev.ico ?? '–'} vs ${r.ico ?? '–'})`)
      prev.issues.push(`duplicita s riadkom ${r.rowNo}`)
    } else seen.set(k, r)
    if (r.deaneryName && !deaneryByFold.has(fold(r.deaneryName))) r.issues.push(`neznámy dekanát „${r.deaneryRaw}“`)
    if (r.kind === 'parish' && !r.deaneryName) r.issues.push('chýba dekanát')
    if (r.kind === 'parish' && r.villages.length === 0) r.issues.push('bez obcí / štatistiky')
  }

  const matched = records.filter((r) => dbByFold.has(fold(r.name)))
  const created = records.filter((r) => !dbByFold.has(fold(r.name)))
  const csvFolds = new Set(records.map((r) => fold(r.name)))
  const dbUnmatched = (parishes ?? []).filter((p) => !csvFolds.has(fold(p.name)))

  const villages = records.reduce((a, r) => a + r.villages.length, 0)
  const catholics = records.reduce((a, r) => a + r.villages.reduce((b, v) => b + (v.catholics ?? 0), 0), 0)

  console.log(`\n=== Import farností – ${APPLY ? 'ZÁPIS' : 'DRY-RUN'} ===`)
  console.log(`CSV: ${records.length} záznamov (${records.filter((r) => r.kind === 'parish').length} farností, ${records.filter((r) => r.kind === 'chaplaincy').length} duchovných správ), ${villages} obcí, ${catholics.toLocaleString('sk-SK')} katolíkov`)
  console.log(`Spárované s DB: ${matched.length} | nové: ${created.length} | v DB bez zhody: ${dbUnmatched.length}`)
  console.log(`IBAN z účtu: ${records.filter((r) => r.iban).length} | spovedanie: ${records.filter((r) => r.confession.length).length} farností`)
  if (skipped.length) console.log('\nPreskočené:\n  ' + skipped.join('\n  '))
  console.log('\nV DB bez zhody v CSV:\n  ' + dbUnmatched.map((p) => p.name).join('\n  '))
  console.log('\nNové (nie sú v DB):\n  ' + created.map((r) => `${r.name} [${r.kind}]`).join('\n  '))
  const withIssues = records.filter((r) => r.issues.length)
  console.log(`\nNa kontrolu (${withIssues.length}):\n  ` + withIssues.map((r) => `${r.name} (r. ${r.rowNo}): ${r.issues.join('; ')}`).join('\n  '))

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['riadok', 'nazov', 'typ', 'dekanat', 'zhoda_db', 'ico', 'iban', 'obce', 'katolici', 'spovedanie', 'poznamky']
  const lines = records.map((r) =>
    [r.rowNo, r.name, r.kind, r.deaneryName, dbByFold.get(fold(r.name))?.name ?? 'NOVÁ', r.ico, r.iban ?? r.account_raw, r.villages.map((v) => v.name).join(' | '), r.villages.reduce((b, v) => b + (v.catholics ?? 0), 0), r.confession.length, r.issues.join('; ')].map(esc).join(',')
  )
  fs.writeFileSync(REPORT_PATH, '﻿' + [header.join(','), ...lines].join('\n'))
  console.log(`\nReport: ${path.relative(process.cwd(), REPORT_PATH)}`)

  // ---------------------------------------------------------- zlúčenie so schematizmom
  const sch = (JSON.parse(fs.readFileSync(SCHEMATIZMUS_PATH, 'utf8')) as SchEntry[]).map((e) => ({
    ...e,
    name: decodeEntities(e.name),
    churches: e.churches.map(decodeEntities),
    adoration_note: e.adoration_note ? decodeEntities(e.adoration_note) : null,
  }))
  // Adresa v tvare „Trnové 010 01 Žilina“ (PSČ v strede riadku) → PSČ + obec
  for (const e of sch) {
    const m = !e.postal_code && e.city ? e.city.match(/^(.*?)\s*(\d{3})\s?(\d{2})\s+(.+)$/) : null
    if (m) {
      e.postal_code = `${m[2]} ${m[3]}`
      e.city = m[4]
    }
  }
  const schBySlugKey = new Map(sch.map((e) => [slugKey(e.name), e]))
  const schBySlug = new Map(sch.map((e) => [e.slug, e]))
  const findSch = (name: string) => schBySlug.get(CSV_TO_SLUG[fold(name)] ?? '') ?? schBySlugKey.get(slugKey(name))

  // CSV záznamy podľa slugu schematizmu (duplicity Makov / sv. Barbora sa zlúčia)
  const csvBySlug = new Map<string, ParishRecord[]>()
  const csvNotInSch: string[] = []
  for (const r of records) {
    const e = findSch(r.name)
    if (!e) {
      csvNotInSch.push(r.name)
      continue
    }
    csvBySlug.set(e.slug, [...(csvBySlug.get(e.slug) ?? []), r])
  }
  console.log(`\nSchematizmus: ${sch.length} | s údajmi z CSV: ${csvBySlug.size} | len schematizmus: ${sch.filter((e) => !csvBySlug.has(e.slug)).map((e) => e.name).join(', ')}`)
  console.log(`CSV mimo oficiálneho zoznamu (neimportuje sa): ${csvNotInSch.join(', ')}`)

  if (!APPLY) {
    console.log('\nDry-run – nič sa nezapísalo. Na zápis spustiť s --apply.')
    return
  }

  // ---------------------------------------------------------- 1. pseudo-farnosti (§ 2)
  const { data: projects } = await db.from('projects').select('id, slug')
  const projectBySlug = new Map((projects ?? []).map((p) => [p.slug, p.id as string]))
  for (const [pname, cfg] of Object.entries(PSEUDO)) {
    const pseudo = (parishes ?? []).find((p) => p.name === pname)
    if (!pseudo) continue
    const { data: donors } = await db.from('donors').select('id').eq('parish_id', pseudo.id)
    const donorIds = (donors ?? []).map((d) => d.id as string)
    const projectId = cfg.project ? projectBySlug.get(cfg.project) : undefined
    if (projectId && donorIds.length) {
      for (const id of donorIds) {
        const { data: ex } = await db.from('donor_projects').select('project_id').eq('donor_id', id).eq('project_id', projectId).maybeSingle()
        if (!ex) await db.from('donor_projects').insert({ donor_id: id, project_id: projectId })
      }
      if (cfg.donations) {
        const { count } = await db.from('donations').update({ project_id: projectId }, { count: 'exact' }).in('donor_id', donorIds).is('project_id', null)
        console.log(`  ${pname}: ${count ?? 0} darov → projekt ${cfg.project}`)
      }
    }
    const { error } = await db.from('parishes').delete().eq('id', pseudo.id)
    console.log(`  pseudo-farnosť ${pname} zmazaná (${donorIds.length} darcov → bez farnosti)${error ? ' CHYBA ' + error.message : ''}`)
  }

  // ---------------------------------------------------------- 2. farnosti
  const { data: dbParishesNow } = await db.from('parishes').select('id, name')
  const dbBySlugKey = new Map((dbParishesNow ?? []).map((p) => [CSV_TO_SLUG[fold(p.name)] ?? slugKey(p.name), p]))
  let inserted = 0
  let updated = 0
  for (const e of sch) {
    const csv = csvBySlug.get(e.slug) ?? []
    const main = csv[0]
    const notes: string[] = []
    let ico = main?.ico ?? null
    if (csv.length > 1) {
      const icos = [...new Set(csv.map((c) => c.ico).filter(Boolean))]
      if (icos.length > 1) {
        notes.push(`V CSV ${csv.length} záznamy s IČO ${icos.join(' / ')} – overiť správne IČO.`)
        if (e.kind === 'chaplaincy') ico = null
      }
    }
    if (main?.account_raw && !main.iban) notes.push(`Účet v CSV: ${main.account_raw} (bez kódu banky – IBAN nedoplnený).`)
    const deanery = e.deanery ? deaneryByFold.get(fold(e.deanery)) : undefined
    const row = {
      name: e.kind === 'parish' ? `Farnosť ${e.name.replace(/ - /g, '-')}` : e.name,
      official_name: e.name,
      slug: e.slug,
      kind: e.kind,
      deanery_id: deanery?.id ?? null,
      street: e.street ?? main?.street ?? null,
      postal_code: e.postal_code,
      city: e.city ?? main?.city ?? null,
      district: main?.district ?? null,
      phone: e.phone ?? main?.phone ?? null,
      email: e.email ?? main?.email ?? null,
      website: e.website ?? main?.website ?? null,
      schematizmus_url: e.url,
      adoration_note: e.adoration_note,
      ico,
      dic: main?.dic ?? null,
      iban: main?.iban ?? null,
      parish_code: main?.parish_code ?? null,
      patrocinium: csv.map((c) => c.patrocinium).find(Boolean) ?? null,
      feast_day: main?.feast_day ?? null,
      adoration_date: main?.adoration_date ?? null,
      administrator_name: e.clergy.find((c) => /farár|administrátor|rektor|duchovný správca/i.test(c.position))?.name ?? null,
      notes: notes.length ? notes.join(' ') : null,
      is_active: true,
    }
    const existing = dbBySlugKey.get(slugKey(e.name)) ?? dbBySlugKey.get(e.slug)
    let parishId: string
    if (existing) {
      // existujúci názov nechávame (darcovia ho poznajú), dopĺňame údaje
      const { name: _n, ...rest } = row
      void _n
      const { error } = await db.from('parishes').update(rest).eq('id', existing.id)
      if (error) throw new Error(`${e.name}: ${error.message}`)
      parishId = existing.id
      updated++
    } else {
      const { data, error } = await db.from('parishes').insert(row).select('id').single()
      if (error || !data) throw new Error(`${e.name}: ${error?.message}`)
      parishId = data.id
      inserted++
    }

    // obce + štatistika (CSV = SODB 2021; inak súhrn zo schematizmu)
    await db.from('parish_villages').delete().eq('parish_id', parishId)
    const villages = csv.flatMap((c) => c.villages)
    const statRows: { village: string; population: number | null; catholics: number | null; source: string }[] = villages.length
      ? villages.map((v) => ({ village: v.name, population: v.population, catholics: v.catholics, source: 'SODB 2021' }))
      : e.population || e.catholics
        ? [{ village: e.name, population: e.population, catholics: e.catholics, source: 'schematizmus dcza.sk' }]
        : []
    // Obce z CSV bez čísel (mestské farnosti) → súhrn zo schematizmu na sídlo farnosti
    if (villages.length && statRows.every((v) => v.catholics == null) && (e.population || e.catholics)) {
      statRows[0] = { ...statRows[0], population: e.population, catholics: e.catholics, source: 'schematizmus dcza.sk' }
    }
    for (const [i, v] of statRows.entries()) {
      const { data: vil, error } = await db
        .from('parish_villages')
        .upsert({ parish_id: parishId, name: v.village, is_seat: i === 0, sort_order: i }, { onConflict: 'parish_id,name' })
        .select('id')
        .single()
      if (error || !vil) throw new Error(`${e.name} / ${v.village}: ${error?.message}`)
      if (v.population != null || v.catholics != null) {
        await db.from('parish_population_stats').upsert({ village_id: vil.id, year: 2021, population: v.population, catholics: v.catholics, source: v.source }, { onConflict: 'village_id,year' })
      }
    }

    // kňazi (schematizmus)
    await db.from('parish_clergy').delete().eq('parish_id', parishId).eq('source', 'schematizmus dcza.sk')
    if (e.clergy.length) {
      await db.from('parish_clergy').insert(
        e.clergy.map((c, i) => ({ parish_id: parishId, full_name: c.name, position: c.position, source: 'schematizmus dcza.sk', sort_order: i }))
      )
    }

    // spovedanie (CSV) – rozvrh „cez rok“
    const confession = csv.flatMap((c) => c.confession)
    if (confession.length) {
      const { data: sched } = await db.from('parish_schedules').upsert({ parish_id: parishId, season: 'regular' }, { onConflict: 'parish_id,season' }).select('id').single()
      if (sched) {
        await db.from('parish_schedule_items').delete().eq('schedule_id', sched.id).eq('service_type', 'confession')
        await db.from('parish_schedule_items').insert(confession.map((c, i) => ({ schedule_id: sched.id, service_type: 'confession', sort_order: i, ...c })))
      }
    }

    await db.from('parish_change_log').insert({ parish_id: parishId, entity: 'parish', action: 'import', changes: { source: ['schematizmus dcza.sk', csv.length ? 'farnosti2.csv' : null].filter(Boolean), villages: statRows.length, clergy: e.clergy.length } })
  }
  console.log(`\nFarnosti: ${updated} aktualizovaných, ${inserted} nových`)

  // ---------------------------------------------------------- 3. snapshot farnosti na daroch (§ 3.5)
  // po farnostiach – dary darcov bez farnosti nesmú zastaviť dopĺňanie ostatných
  let backfilled = 0
  const { data: allParishes } = await db.from('parishes').select('id')
  for (const p of allParishes ?? []) {
    const { data: ds } = await db.from('donors').select('id').eq('parish_id', p.id)
    const ids = (ds ?? []).map((d) => d.id as string)
    for (let i = 0; i < ids.length; i += 200) {
      const { count } = await db.from('donations').update({ parish_id: p.id }, { count: 'exact' }).in('donor_id', ids.slice(i, i + 200)).is('parish_id', null)
      backfilled += count ?? 0
    }
  }
  console.log(`donations.parish_id doplnené: ${backfilled}`)
}

interface SchEntry {
  slug: string
  url: string
  name: string
  kind: 'parish' | 'chaplaincy'
  deanery: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  clergy: { name: string; position: string }[]
  population: number | null
  catholics: number | null
  adoration_note: string | null
  churches: string[]
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
