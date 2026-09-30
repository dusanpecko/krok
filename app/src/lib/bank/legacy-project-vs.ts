import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Párovanie darov prevodom podľa VS výzvy zo starého webu (rad 1177xxxx).
 *
 * Na starom webe mala každá výzva vlastný variabilný symbol a darcovia si naň
 * nastavili trvalé príkazy. V Kroku VS identifikuje darcu, nie výzvu, takže by
 * tieto platby ostali nespárované. Ak VS platby sedí s `projects.legacy_variable_symbol`,
 * dar sa zapíše k výzve a darca sa určí podľa platiteľa (createLegacyPayerResolver):
 * IBAN z predošlých platieb → meno → nový darca. Systémový „Anonymný darca“
 * (donors.legacy_id = ANONYMOUS_DONOR, migrácia 024) je len núdzová možnosť.
 *
 * Zo starého webu existujú aj „zástupní darcovia“ s VS výzvy (napr. „Lectio Divina“,
 * VS 11770001) – na tých sa nové platby už nepárujú, aby každý platiteľ bol
 * samostatný darca (počet podporovateľov výzvy).
 */

export const ANONYMOUS_DONOR_LEGACY_ID = 'ANONYMOUS_DONOR'

/**
 * Spustenie výziev v Kroku. Platby pred týmto dátumom sú „história“:
 *  - darca podľa VS ako doteraz (aj zástupný „darca výzvy“ zo starého webu),
 *  - k výzve sa podľa VS výzvy priradia, OKREM výziev, ktorých legacy_collected_amount
 *    staré bankové dary už obsahuje (inak by sa na webe zarátali dvakrát).
 */
export const KROK_PROJECTS_START = '2026-04-15'

/** Výzvy (slug), ktorých legacy suma už obsahuje bankové dary spred KROK_PROJECTS_START. */
export const LEGACY_TOTAL_INCLUDES_BANK_SLUGS = ['s-farskou-charitou-blizsie-k-vam', 'podpora-mladeze']

export function isHistoricalPayment(bookingDate: string | null | undefined): boolean {
  return !!bookingDate && bookingDate.slice(0, 10) < KROK_PROJECTS_START
}

/** Normalizácia VS na porovnanie: len číslice, bez úvodných núl. */
export function normalizeVs(vs: string | null | undefined): string {
  if (!vs) return ''
  const digits = String(vs).replace(/\D/g, '').replace(/^0+/, '')
  return digits
}

/** Id výzv, ku ktorým sa historické platby podľa VS výzvy nepriraďujú (LEGACY_TOTAL_INCLUDES_BANK_SLUGS). */
export async function loadHistoricalExcludedProjectIds(admin: SupabaseClient): Promise<Set<string>> {
  const { data } = await admin.from('projects').select('id').in('slug', LEGACY_TOTAL_INCLUDES_BANK_SLUGS)
  return new Set((data ?? []).map((p) => p.id as string))
}

/** Výzva podľa VS výzvy zo starého webu, s ohľadom na historické pravidlo. */
export function legacyProjectForPayment(
  bookingDate: string | null | undefined,
  vs: string | null | undefined,
  projectLegacyVsMap: Map<string, string>,
  historicalExcluded: Set<string>
): string | null {
  const pid = projectLegacyVsMap.get(normalizeVs(vs)) ?? null
  if (pid && isHistoricalPayment(bookingDate) && historicalExcluded.has(pid)) return null
  return pid
}

/**
 * VS darcu napísaný v popise platby namiesto poľa VS (napr. „Krok, 11770378“).
 * Hľadá čísla z radu VS darcov (1177xxxx); vráti darcu len pri jednoznačnej zhode.
 * VS výziev zo starého webu sa ignorujú (tie neurčujú darcu).
 */
export function findDonorByVsInText(
  text: string | null | undefined,
  donorVsMap: Map<string, string>,
  projectLegacyVsMap: Map<string, string>
): string | null {
  if (!text) return null
  const ids = new Set<string>()
  for (const m of text.matchAll(/(?<!\d)0*(1177\d{4})(?!\d)/g)) {
    const vs = m[1]
    if (projectLegacyVsMap.has(vs)) continue
    const id = donorVsMap.get(vs)
    if (id) ids.add(id)
  }
  return ids.size === 1 ? [...ids][0] : null
}

/** Mapa normalizovaný legacy VS → project_id. */
export async function loadProjectLegacyVsMap(admin: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const { data, error } = await admin
    .from('projects')
    .select('id, legacy_variable_symbol')
    .not('legacy_variable_symbol', 'is', null)
  if (error) {
    console.error('[bank] loadProjectLegacyVsMap:', error.message)
    return map
  }
  for (const p of (data ?? []) as { id: string; legacy_variable_symbol: string | null }[]) {
    const key = normalizeVs(p.legacy_variable_symbol)
    if (key) map.set(key, p.id)
  }
  return map
}

/** Id systémového anonymného darcu; ak neexistuje, založí ho. */
export async function getAnonymousDonorId(admin: SupabaseClient): Promise<string | null> {
  const { data: existing } = await admin
    .from('donors')
    .select('id')
    .eq('legacy_id', ANONYMOUS_DONOR_LEGACY_ID)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data: created, error } = await admin
    .from('donors')
    .insert({
      legacy_id: ANONYMOUS_DONOR_LEGACY_ID,
      first_name: 'Anonymný',
      last_name: 'darca',
      donor_type: 'individual',
      status: 'active',
      notes: 'Systémový záznam: dary prevodom bez známeho darcu, priradené k výzve podľa VS zo starého webu. Nemazať.',
    })
    .select('id')
    .single()
  if (error) {
    console.error('[bank] getAnonymousDonorId: založenie zlyhalo:', error.message)
    return null
  }
  return created.id as string
}

/** Darca „DARY Donátor“ – hromadný anonymný záznam zo starého systému (legacy_id 11770000). */
const LEGACY_ANONYMOUS_DONOR_LEGACY_ID = '11770000'

function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** IBAN bez medzier; hodnoty, ktoré nie sú IBAN (napr. staré „ID pokynu“ z Fio API), → ''. */
export function normalizeIban(iban: string | null | undefined): string {
  const v = (iban || '').replace(/\s+/g, '').toUpperCase()
  return /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(v) ? v : ''
}

// Tituly a skratky, ktoré banka pridáva k menu platiteľa
const TITLES = new Set([
  'ing', 'mgr', 'bc', 'judr', 'mudr', 'mvdr', 'phdr', 'rndr', 'paeddr', 'thdr', 'thlic', 'icdr',
  'doc', 'prof', 'dr', 'phd', 'csc', 'mba', 'arch', 'in', 'mg',
])

// Slová, podľa ktorých ide o organizáciu / farnosť, nie o osobu
const ORG_HINTS = /\b((s\.?\s?r\.?\s?o|a\.?\s?s|n\.?\s?o|o\.?\s?z|zs|spol)\b|nadacia|obec|mesto|skola|firma|cirk|farnost|farsk|rimskokat|grekokat|charita|diecez)/

/** Rozdelí meno z banky na meno a priezvisko (bez titulov, „Priezvisko, Meno“ → Meno Priezvisko). */
export function parsePayerName(raw: string): { first: string; last: string; isOrganization: boolean } {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (ORG_HINTS.test(fold(name))) return { first: name, last: '', isOrganization: true }

  let ordered = name
  // true = slová sú v poradí „Priezvisko Meno“
  let surnameFirst = false
  const comma = name.split(',')
  if (comma.length === 2 && comma[0].trim() && comma[1].trim()) {
    const after = comma[1].trim().replace(/\./g, '')
    if (TITLES.has(fold(after))) {
      // „Mikula Roland, Ing.“ – Fio posiela „Priezvisko Meno, Titul“
      ordered = comma[0]
      surnameFirst = true
    } else {
      // „Pecko, Dušan“ → Priezvisko, Meno
      ordered = `${comma[1]} ${comma[0]}`
    }
  }

  const words = ordered
    .split(/[\s,]+/)
    .filter((w) => w && /\p{L}/u.test(w) && !TITLES.has(fold(w.replace(/\./g, ''))))
    .map((w) => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))

  if (words.length === 0) return { first: name, last: '', isOrganization: false }
  if (words.length === 1) return { first: words[0], last: '', isOrganization: false }
  // Bez čiarky banka posiela „Meno Priezvisko“ aj „Priezvisko Meno“ – ženské priezvisko
  // na -ová/-ova na začiatku prezradí druhé poradie. Pri párovaní podľa mena na poradí nezáleží.
  if (!surnameFirst && /ov[aá]$/.test(fold(words[0])) && !/ov[aá]$/.test(fold(words[words.length - 1]))) surnameFirst = true
  return surnameFirst
    ? { first: words[words.length - 1], last: words.slice(0, -1).join(' '), isOrganization: false }
    : { first: words[0], last: words.slice(1).join(' '), isOrganization: false }
}

function nameKey(parts: string[]): string {
  return parts
    .flatMap((p) => fold(p).split(/[^a-z0-9]+/))
    .filter((w) => w && !TITLES.has(w))
    .sort()
    .join(' ')
}

/**
 * Zástupní darcovia – na tých sa podľa IBAN-u / mena nikdy nepáruje:
 * „darcovia výzvy“ zo starého webu (VS = VS výzvy), Anonymný darca, DARY Donátor.
 */
export async function loadPseudoDonorIds(admin: SupabaseClient, projectLegacyVsMap: Map<string, string>): Promise<Set<string>> {
  const legacyVs = [...projectLegacyVsMap.keys()]
  const legacyIds = [...legacyVs, ANONYMOUS_DONOR_LEGACY_ID, LEGACY_ANONYMOUS_DONOR_LEGACY_ID]
  const or = [`legacy_id.in.(${legacyIds.join(',')})`]
  if (legacyVs.length) or.push(`variable_symbol.in.(${legacyVs.join(',')})`)
  const { data } = await admin.from('donors').select('id').or(or.join(','))
  return new Set((data ?? []).map((d) => d.id as string))
}

/**
 * Účty, z ktorých platí veľa rôznych ľudí (Slovenská pošta – inkaso a poštové poukazy).
 * Pravidlo IBAN sa na ne nepoužíva – inak by sa platby rôznych darcov spárovali s jedným.
 */
export const SHARED_PAYER_IBANS = new Set(['SK7502000080100138303012', 'SK6902000020140015805012'])

/** Poštové poukazy (jednotliví platitelia cez poštu) → všeobecný dar na „DARY Donátor“ (rozhodnutie 2026-09-30). */
export const POST_VOUCHER_IBAN = 'SK6902000020140015805012'

/** Id darcu „DARY Donátor“ (legacy_id 11770000) – všeobecné anonymné dary. */
export async function getGeneralAnonymousDonorId(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from('donors').select('id').eq('legacy_id', LEGACY_ANONYMOUS_DONOR_LEGACY_ID).maybeSingle()
  return (data?.id as string | undefined) ?? null
}

/**
 * „Pravidlo IBAN“: mapa IBAN → darca z donors.iban a z histórie spárovaných platieb
 * (ručné spárovanie tak funguje ako pravidlo pre ďalšie platby z toho istého účtu).
 * null = nejednoznačné (z účtu platili rôzni darcovia, napr. zdieľaný rodinný účet) – nepárovať.
 * Načítava sa len pre IBAN-y z aktuálnej dávky (po dávkach, so stránkovaním).
 */
export async function loadIbanDonorMap(
  admin: SupabaseClient,
  rawIbans: (string | null | undefined)[],
  pseudoIds: Set<string>
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  const set = (iban: string, donorId: string | null | undefined) => {
    if (!iban || !donorId || pseudoIds.has(donorId)) return
    const prev = map.get(iban)
    if (prev === undefined) map.set(iban, donorId)
    else if (prev !== donorId) map.set(iban, null)
  }

  const raw = [...new Set(rawIbans.filter((x): x is string => !!x && !!normalizeIban(x) && !SHARED_PAYER_IBANS.has(normalizeIban(x))))]
  const normalized = [...new Set(raw.map(normalizeIban))]
  if (normalized.length === 0) return map

  for (let i = 0; i < normalized.length; i += 150) {
    const { data } = await admin.from('donors').select('id, iban').in('iban', normalized.slice(i, i + 150))
    for (const d of data ?? []) set(normalizeIban(d.iban), d.id)
  }

  // IBAN v bank_transactions môže byť uložený s medzerami – hľadáme pôvodný aj normalizovaný tvar
  const lookup = [...new Set([...raw, ...normalized])]
  for (let i = 0; i < lookup.length; i += 150) {
    const part = lookup.slice(i, i + 150)
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('bank_transactions')
        .select('counterparty_iban, donor_id')
        .eq('matched', true)
        .not('donor_id', 'is', null)
        .in('counterparty_iban', part)
        .range(from, from + 999)
      if (error) {
        console.error('[bank] loadIbanDonorMap:', error.message)
        break
      }
      for (const h of data ?? []) set(normalizeIban(h.counterparty_iban), h.donor_id)
      if (!data || data.length < 1000) break
    }
  }
  return map
}

export interface LegacyPayerTx {
  counterparty_iban?: string | null
  counterparty_name?: string | null
  variable_symbol?: string | null
}

/**
 * Určí darcu pre platby s VS výzvy zo starého webu – aby každý platiteľ bol samostatný darca.
 * Poradie: IBAN (z donors.iban alebo z jeho predošlých spárovaných platieb) → jednoznačná
 * zhoda mena → nový darca (meno + IBAN z banky). Bez mena aj IBAN-u → anonymný darca.
 *
 * `prepare` načíta podklady len pre IBAN-y z aktuálnej dávky; `resolve` volať postupne
 * (novozaložení darcovia sa cachujú, aby dve platby z jedného účtu nevytvorili dvoch darcov).
 */
export async function createLegacyPayerResolver(
  admin: SupabaseClient,
  projectLegacyVsMap: Map<string, string>,
  txs: LegacyPayerTx[]
) {
  const relevant = txs.filter((t) => projectLegacyVsMap.has(normalizeVs(t.variable_symbol)))

  const pseudoIds = await loadPseudoDonorIds(admin, projectLegacyVsMap)
  const payerIdOf = (id: string | null | undefined) => (id && !pseudoIds.has(id) ? id : null)
  const ibanToDonor = await loadIbanDonorMap(admin, relevant.map((t) => t.counterparty_iban), pseudoIds)

  // Zhoda mena bez diakritiky (banka posiela „Kramarova“, v DB je „Kramarová“)
  const findByName = async (first: string, last: string) => {
    if (!last) return []
    const { data } = await admin.rpc('search_donors_unaccent', { search_query: `${first} ${last}` })
    const key = nameKey([first, last])
    const ids = ((data ?? []) as { id: string; first_name: string; last_name: string }[])
      .filter((d) => payerIdOf(d.id) && nameKey([d.first_name, d.last_name]) === key)
      .map((d) => d.id)
    if (ids.length === 0) {
      // skúsime aj opačné poradie („Priezvisko Meno“)
      const { data: rev } = await admin.rpc('search_donors_unaccent', { search_query: `${last} ${first}` })
      for (const d of (rev ?? []) as { id: string; first_name: string; last_name: string }[]) {
        if (payerIdOf(d.id) && nameKey([d.first_name, d.last_name]) === key) ids.push(d.id)
      }
    }
    if (ids.length === 0) return []
    const { data: withIban } = await admin.from('donors').select('id, iban').in('id', [...new Set(ids)])
    return (withIban ?? []) as { id: string; iban: string | null }[]
  }

  // VS pre nových darcov (rovnako ako registrácia / Mollie: max + 1)
  let nextVs: number | null = null
  const allocateVs = async () => {
    if (nextVs === null) {
      const { data: vsData } = await admin.from('donors').select('variable_symbol').not('variable_symbol', 'is', null)
      nextVs = (vsData ?? []).reduce((max: number, d: { variable_symbol: string | null }) => {
        const n = parseInt(d.variable_symbol || '0', 10)
        return n > max ? n : max
      }, 11771451)
    }
    nextVs += 1
    return String(nextVs)
  }

  let anonymousId: string | null | undefined

  return {
    /** Vráti id darcu pre platbu s VS výzvy (alebo null, ak sa nepodarilo ani anonymne). */
    async resolve(tx: LegacyPayerTx, projectName?: string | null): Promise<string | null> {
      const iban = normalizeIban(tx.counterparty_iban)

      // 1. IBAN
      if (iban) {
        const byIban = ibanToDonor.get(iban)
        if (byIban) return byIban
      }

      const parsed = tx.counterparty_name ? parsePayerName(tx.counterparty_name) : null

      // 2. Meno (jednoznačná zhoda, bez konfliktu IBAN-u)
      if (parsed && !parsed.isOrganization && (!iban || ibanToDonor.get(iban) !== null)) {
        const hits = (await findByName(parsed.first, parsed.last)).filter(
          (d) => !d.iban || !iban || normalizeIban(d.iban) === iban
        )
        if (hits.length === 1) {
          const id = hits[0].id
          if (iban) {
            if (!hits[0].iban) await admin.from('donors').update({ iban }).eq('id', id)
            ibanToDonor.set(iban, id)
          }
          return id
        }
      }

      // 3. Nový darca z údajov platiteľa
      if (parsed && (iban || parsed.first)) {
        const vs = await allocateVs()
        const { data: created, error } = await admin
          .from('donors')
          .insert({
            first_name: parsed.first,
            last_name: parsed.last,
            company_name: parsed.isOrganization ? parsed.first : null,
            donor_type: parsed.isOrganization ? 'organization' : 'individual',
            iban: iban || null,
            variable_symbol: vs,
            status: 'active',
            notes: `Vytvorený automaticky z bankovej platby${projectName ? ` na výzvu „${projectName}“` : ''} (VS ${tx.variable_symbol}). Meno z banky: ${tx.counterparty_name}.`,
          })
          .select('id')
          .single()
        if (!error && created) {
          if (iban) ibanToDonor.set(iban, created.id)
          return created.id
        }
        console.error('[bank] Založenie darcu z platby zlyhalo:', error?.message)
      }

      // 4. Núdzovo anonymný darca
      if (anonymousId === undefined) anonymousId = await getAnonymousDonorId(admin)
      return anonymousId
    },
  }
}
