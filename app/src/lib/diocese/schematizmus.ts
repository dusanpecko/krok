import { cache } from 'react'
import { dioceseDb } from './public'
import { personName, roleRank, type BodyKind } from './bodies'
import { encodeEmail } from './email-code'

/**
 * Verejný schematizmus na dcza.sk (K5 / D4, O47): meno s titulmi, funkcia, pôvod, diakonát a kňazská
 * vysviacka, história pôsobenia po rokoch, dekanát a farnosť, diecézny e-mail (@dcza.sk). NIKDY fotka,
 * súkromný e-mail, telefón, dátum narodenia, adresa ani iné súkromné údaje – preto sa číta vždy len
 * vymenovaný zoznam stĺpcov. Serverový modul.
 */

const PUBLIC_CATEGORIES = ['bishop', 'priest', 'deacon', 'permanent_deacon']
const PUBLIC_STATUSES = ['active', 'retired', 'studying']
const PUBLIC_COLUMNS = 'id, slug, schematizmus_slug, category, status, first_name, last_name, title_before, title_after, ecclesiastical_titles, religious_order_id, work_email'

type ClergyRow = {
  id: string
  slug: string | null
  schematizmus_slug: string | null
  category: string
  status: string
  first_name: string
  last_name: string
  title_before: string | null
  title_after: string | null
  ecclesiastical_titles: string[] | null
  religious_order_id: string | null
  work_email: string | null
}
type AssignmentRow = {
  clergy_id: string
  kind: string
  role: string | null
  organization: string | null
  year_from: number | null
  year_to: number | null
  date_from: string | null
  date_to: string | null
  is_primary: boolean
  parishes: { name: string; slug: string | null; deanery_id: string | null } | null
  deaneries: { id: string; name: string } | null
}

export interface PublicFunction {
  role: string
  place: string | null
  parishSlug: string | null
}

export interface PublicClergySummary {
  slug: string
  name: string
  /** priezvisko a meno – zoradenie a abeceda */
  sortName: string
  letter: string
  order: string | null
  category: string
  retired: boolean
  /** len diecézna adresa @dcza.sk, zakódovaná (encodeEmail) – čitateľne ju poskladá až prehliadač */
  emailCode: string | null
  functions: PublicFunction[]
  deanery: { id: string; name: string } | null
}

export interface PublicClergyProfile extends PublicClergySummary {
  honorary: string[]
  origin: string | null
  diaconate: { date: string | null; place: string | null } | null
  ordination: { date: string | null; place: string | null } | null
  history: { years: string; text: string; parishSlug: string | null; current: boolean }[]
}

/** Pred menom len „Mons.“; čestné tituly (honorárny dekan, kanonik) zvlášť; ostatné hodnoty z importu verejne nie. */
const PREFIX_TITLES = /^mons\.?$/i
const HONORARY = /dekan|kanonik/i
export const honoraryTitles = (t: string[] | null) =>
  (t ?? []).filter((x) => HONORARY.test(x) && !/školsk/i.test(x)).map((x) => x.charAt(0).toUpperCase() + x.slice(1).replace(/\bnitre\b/g, 'Nitre').replace(/\bnitrianskej\b/g, 'nitrianskej'))

export function displayName(c: Pick<ClergyRow, 'first_name' | 'last_name' | 'title_before' | 'title_after' | 'ecclesiastical_titles'>, orderCode?: string | null): string {
  const before = [...(c.ecclesiastical_titles ?? []).filter((x) => PREFIX_TITLES.test(x)).map(() => 'Mons.'), c.title_before].filter(Boolean).join(' ')
  return [before, c.first_name, c.last_name, orderCode, c.title_after ? `, ${c.title_after}` : null].filter(Boolean).join(' ').replace(' ,', ',')
}

const dioceseEmail = (e: string | null) => (e && /^[^@\s]+@dcza\.sk$/i.test(e.trim()) ? e.trim().toLowerCase() : null)
const slugOf = (c: ClergyRow) => c.slug || c.schematizmus_slug || c.id
const isCurrent = (a: AssignmentRow) => !a.date_to && !a.year_to
const place = (a: AssignmentRow) => a.parishes?.name.replace(/^Farnosť /, '') ?? a.deaneries?.name ?? a.organization ?? null

const ASG_COLUMNS = 'clergy_id, kind, role, organization, year_from, year_to, date_from, date_to, is_primary, parishes(name, slug, deanery_id), deaneries(id, name)'

async function loadOrders() {
  const { data } = await dioceseDb().from('religious_orders').select('id, code')
  return new Map((data ?? []).map((o) => [o.id as string, o.code as string]))
}

/** „diecézny biskup“ vedľa „diecézny biskup Žilina“ – kratšia funkcia obsiahnutá v dlhšej sa vynechá. */
function dedupeFunctions(list: PublicFunction[]): PublicFunction[] {
  return list.filter((f, i) => !list.some((g, j) => j !== i && !f.place && g.role !== f.role && g.role.startsWith(f.role)))
}

function summarize(c: ClergyRow, asg: AssignmentRow[], orders: Map<string, string>, deaneries: Map<string, string>): PublicClergySummary {
  const current = asg.filter(isCurrent).sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
  const primaryParish = current.find((a) => a.parishes)?.parishes ?? null
  const deaneryId = current.find((a) => a.deaneries)?.deaneries?.id ?? primaryParish?.deanery_id ?? null
  const order = c.religious_order_id ? orders.get(c.religious_order_id) ?? null : null
  return {
    slug: slugOf(c),
    name: displayName(c, order),
    sortName: `${c.last_name} ${c.first_name}`,
    letter: c.last_name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase(),
    order,
    category: c.category,
    retired: c.status === 'retired',
    emailCode: dioceseEmail(c.work_email) ? encodeEmail(dioceseEmail(c.work_email)!) : null,
    functions: dedupeFunctions(
      current
        .filter((a) => a.role?.trim())
        .map((a) => ({ role: a.role!.trim().replace(/^[–-]\s*/, ''), place: a.parishes ? place(a) : a.kind === 'deanery' ? a.deaneries?.name ?? null : null, parishSlug: a.parishes?.slug ?? null }))
    ),
    deanery: deaneryId ? { id: deaneryId, name: deaneries.get(deaneryId) ?? '' } : null,
  }
}

/** Kňazi, diakoni a biskup v službe, na odpočinku a na štúdiu – zoznam. */
export const listPublicClergy = cache(async (): Promise<PublicClergySummary[]> => {
  const db = dioceseDb()
  const [{ data: clergy }, { data: asg }, orders, { data: dean }] = await Promise.all([
    db.from('clergy').select(PUBLIC_COLUMNS).in('category', PUBLIC_CATEGORIES).in('status', PUBLIC_STATUSES).order('last_name').order('first_name'),
    db.from('clergy_assignments').select(ASG_COLUMNS).is('date_to', null).is('year_to', null),
    loadOrders(),
    db.from('deaneries').select('id, name'),
  ])
  const deaneries = new Map((dean ?? []).map((d) => [d.id as string, d.name as string]))
  const byClergy = new Map<string, AssignmentRow[]>()
  for (const a of (asg ?? []) as unknown as AssignmentRow[]) byClergy.set(a.clergy_id, [...(byClergy.get(a.clergy_id) ?? []), a])
  return ((clergy ?? []) as ClergyRow[]).map((c) => summarize(c, byClergy.get(c.id) ?? [], orders, deaneries)).sort((a, b) => a.sortName.localeCompare(b.sortName, 'sk'))
})

/** Profil – podľa nášho slugu alebo starého slugu z dcza.sk/schematizmus. */
export async function getPublicClergy(slug: string): Promise<PublicClergyProfile | null> {
  const db = dioceseDb()
  const { data } = await db
    .from('clergy')
    .select(`${PUBLIC_COLUMNS}, origin, diaconate_date, diaconate_place, ordination_date, ordination_place`)
    .in('category', PUBLIC_CATEGORIES)
    .in('status', PUBLIC_STATUSES)
    .or(`slug.eq.${slug},schematizmus_slug.eq.${slug}`)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const c = data as ClergyRow & { origin: string | null; diaconate_date: string | null; diaconate_place: string | null; ordination_date: string | null; ordination_place: string | null }
  const [{ data: asg }, orders, { data: dean }] = await Promise.all([
    db.from('clergy_assignments').select(ASG_COLUMNS).eq('clergy_id', c.id),
    loadOrders(),
    db.from('deaneries').select('id, name'),
  ])
  const rows = (asg ?? []) as unknown as AssignmentRow[]
  const deaneries = new Map((dean ?? []).map((d) => [d.id as string, d.name as string]))
  const yearOf = (a: AssignmentRow, which: 'from' | 'to') => (which === 'from' ? a.year_from ?? (a.date_from ? Number(a.date_from.slice(0, 4)) : null) : a.year_to ?? (a.date_to ? Number(a.date_to.slice(0, 4)) : null))
  const history = rows
    .filter((a) => a.role)
    .sort((a, b) => (yearOf(a, 'from') ?? 0) - (yearOf(b, 'from') ?? 0))
    .map((a) => {
      const from = yearOf(a, 'from')
      const to = yearOf(a, 'to')
      const years = from ? (to && to !== from ? `${from} – ${to}` : !to && !isCurrent(a) ? String(from) : to === from ? String(from) : `od ${from}`) : ''
      // diecézne funkcie bez „Biskupský úrad“ a pod.; farnosť / dekanát / iné miesto sa pripojí
      const where = a.kind === 'diocese' ? null : place(a)
      const role = a.role!.trim().replace(/^[–-]\s*/, '')
      return { years, text: where && !role.includes(where) ? `${role} ${where}` : role, parishSlug: a.parishes?.slug ?? null, current: isCurrent(a) }
    })
  return {
    ...summarize(c, rows, orders, deaneries),
    honorary: honoraryTitles(c.ecclesiastical_titles),
    origin: c.origin,
    diaconate: c.diaconate_date || c.diaconate_place ? { date: c.diaconate_date, place: c.diaconate_place } : null,
    ordination: c.ordination_date || c.ordination_place ? { date: c.ordination_date, place: c.ordination_place } : null,
    history,
  }
}

/** Zomrelí kňazi – meno, dátum a miesto úmrtia. */
export async function listDeceasedClergy() {
  const { data } = await dioceseDb()
    .from('clergy')
    .select('first_name, last_name, title_before, title_after, ecclesiastical_titles, death_date, death_place')
    .eq('category', 'priest')
    .eq('status', 'deceased')
    .order('death_date', { ascending: false, nullsFirst: false })
  return (data ?? []).map((c) => ({ name: displayName(c as unknown as ClergyRow), death_date: c.death_date as string | null, death_place: c.death_place as string | null }))
}

/** Dekanáty: dekan, farnosti a počet kňazov. */
export async function listPublicDeaneries() {
  const db = dioceseDb()
  const [{ data: dean }, { data: parishes }, clergy, { data: deans }] = await Promise.all([
    db.from('deaneries').select('id, name').order('name'),
    db.from('parishes').select('name, slug, kind, deanery_id').eq('is_active', true).order('name'),
    listPublicClergy(),
    db.from('clergy_assignments').select('deanery_id, clergy:clergy_id(slug, schematizmus_slug, first_name, last_name, title_before, title_after, ecclesiastical_titles, status)').eq('kind', 'deanery').ilike('role', 'dekan').is('date_to', null).is('year_to', null),
  ])
  return (dean ?? []).map((d) => {
    const dk = (deans ?? []).find((x) => x.deanery_id === d.id)?.clergy as unknown as (ClergyRow & { status: string }) | undefined
    return {
      id: d.id as string,
      name: d.name as string,
      dean: dk && PUBLIC_STATUSES.includes(dk.status) ? { name: displayName(dk), slug: dk.slug || dk.schematizmus_slug } : null,
      parishes: (parishes ?? []).filter((p) => p.deanery_id === d.id).map((p) => ({ name: (p.name as string).replace(/^Farnosť /, ''), slug: p.slug as string | null, kind: p.kind as string })),
      clergyCount: clergy.filter((c) => c.deanery?.id === d.id).length,
    }
  })
}

// ------------------------------------------------------------ kúria, rady a komisie (051)

export interface CuriaPerson {
  name: string
  slug: string | null // profil v schematizme (len kňazi a diakoni z registra)
  role: string
  note: string | null
}

export interface CuriaBody {
  slug: string
  name: string
  kind: BodyKind
  description: string | null
  people: CuriaPerson[]
}

/** Zverejnené orgány s aktuálnymi členmi: kňazi z registra (menovanie s body_id) + členovia mimo registra. */
export const listCuria = cache(async (): Promise<CuriaBody[]> => {
  const db = dioceseDb()
  const [{ data: bodies }, { data: asg }, { data: ext }] = await Promise.all([
    db.from('diocese_bodies').select('id, slug, name, kind, description').eq('published', true).order('sort_order'),
    db
      .from('clergy_assignments')
      .select(`body_id, body_role, role, clergy:clergy_id(${PUBLIC_COLUMNS})`)
      .not('body_id', 'is', null)
      .is('date_to', null)
      .is('year_to', null),
    db.from('diocese_body_members').select('body_id, title_before, first_name, last_name, title_after, affiliation, body_role').is('date_to', null),
  ])
  const clergyRows = (asg ?? []) as unknown as { body_id: string; body_role: string | null; role: string; clergy: ClergyRow | null }[]
  return (bodies ?? []).map((b) => {
    const people: { p: CuriaPerson; sort: string; rank: number }[] = []
    for (const r of clergyRows) {
      const c = r.clergy
      if (r.body_id !== b.id || !c || !PUBLIC_CATEGORIES.includes(c.category) || !PUBLIC_STATUSES.includes(c.status)) continue
      const slug = c.slug || c.schematizmus_slug || null
      const role = (r.body_role || r.role).trim().replace(/^[–-]\s*/, '')
      if (people.some((x) => x.p.slug && x.p.slug === slug)) continue
      people.push({ p: { name: displayName(c), slug, role, note: null }, sort: c.last_name, rank: roleRank(role) })
    }
    for (const m of ext ?? []) {
      if (m.body_id !== b.id) continue
      people.push({ p: { name: personName(m), slug: null, role: m.body_role, note: m.affiliation }, sort: m.last_name, rank: roleRank(m.body_role) })
    }
    people.sort((x, y) => x.rank - y.rank || x.sort.localeCompare(y.sort, 'sk'))
    return { slug: b.slug, name: b.name, kind: b.kind as BodyKind, description: b.description, people: people.map((x) => x.p) }
  })
})

/** Odkazy do menu (Kúria → Rady a komisie → …). */
export async function listCuriaLinks(): Promise<{ name: string; slug: string; kind: BodyKind }[]> {
  const { data } = await dioceseDb().from('diocese_bodies').select('slug, name, kind').eq('published', true).order('sort_order')
  return (data ?? []) as { name: string; slug: string; kind: BodyKind }[]
}
