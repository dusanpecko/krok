import { createClient } from '@/lib/supabase/server'
import { sanitizeSearchTerm } from '@/lib/search'

/**
 * Zdieľaný dotaz na zoznam darcov pre stránku /admin/darcovia aj export.
 * Filtre a radenie sú rovnaké, líši sa len stránkovanie (export berie všetko).
 */

export const PAGE_SIZES = [20, 100, 500, 1000] as const
export const DEFAULT_PAGE_SIZE = 20

export type DonorSortBy = 'last_name' | 'variable_symbol' | 'status' | 'email' | 'total_donated' | 'last_donation'

export interface DonorListParams {
  q: string
  status: string
  parish: string
  project: string
  from: string
  to: string
  selected: string
  ids: string[]
  sortBy: DonorSortBy
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
}

export interface DonorListRow {
  id: string
  legacy_id: string | null
  variable_symbol: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  city: string | null
  status: 'active' | 'inactive' | 'suspended'
  parishes: { name: string } | null
  total_donated: number
  donations_count: number
  last_donation_date: string | null
  last_donation_amount: number | null
}

const SORT_FIELDS: DonorSortBy[] = ['last_name', 'variable_symbol', 'status', 'email', 'total_donated', 'last_donation']

export function parseDonorListParams(raw: Record<string, string | undefined>): DonorListParams {
  const sortBy = SORT_FIELDS.includes(raw.sortBy as DonorSortBy) ? (raw.sortBy as DonorSortBy) : 'last_name'
  const pageSizeRaw = parseInt(raw.pageSize || '', 10)
  const pageSize = (PAGE_SIZES as readonly number[]).includes(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE
  return {
    q: raw.q || '',
    status: raw.status || 'all',
    parish: raw.parish || 'all',
    project: raw.project || 'all',
    from: raw.from || '',
    to: raw.to || '',
    selected: raw.selected || 'all',
    ids: raw.ids ? raw.ids.split(',').filter(Boolean) : [],
    sortBy,
    sortOrder: raw.sortOrder === 'desc' ? 'desc' : 'asc',
    page: Math.max(1, parseInt(raw.page || '1', 10) || 1),
    pageSize,
  }
}

type RawDonation = { amount: number | string | null; donation_date: string | null }
type RawDonor = Record<string, unknown> & {
  donations?: RawDonation[] | null
  parishes?: { name: string } | { name: string }[] | null
}

function mapRow(d: RawDonor): DonorListRow {
  const donations = (d.donations ?? []) as RawDonation[]
  let total = 0
  let last: RawDonation | null = null
  for (const don of donations) {
    total += Number(don.amount) || 0
    if (don.donation_date && (!last || !last.donation_date || don.donation_date > last.donation_date)) last = don
  }
  const parishRel = d.parishes
  const parish = Array.isArray(parishRel) ? parishRel[0] ?? null : parishRel ?? null
  return {
    id: String(d.id),
    legacy_id: (d.legacy_id as string | null) ?? null,
    variable_symbol: (d.variable_symbol as string | null) ?? null,
    first_name: String(d.first_name ?? ''),
    last_name: String(d.last_name ?? ''),
    email: (d.email as string | null) ?? null,
    phone: (d.phone as string | null) ?? null,
    city: (d.city as string | null) ?? null,
    status: (d.status as DonorListRow['status']) ?? 'active',
    parishes: parish,
    total_donated: Math.round(total * 100) / 100,
    donations_count: donations.length,
    last_donation_date: last?.donation_date ?? null,
    last_donation_amount: last ? Number(last.amount) || 0 : null,
  }
}

function compareRows(a: DonorListRow, b: DonorListRow, sortBy: DonorSortBy, asc: boolean): number {
  const dir = asc ? 1 : -1
  const str = (x: string | null | undefined) => (x ?? '').toLocaleLowerCase('sk')
  switch (sortBy) {
    case 'total_donated':
      return (a.total_donated - b.total_donated) * dir
    case 'last_donation': {
      // Darcovia bez daru vždy na konci, bez ohľadu na smer
      if (!a.last_donation_date && !b.last_donation_date) return str(a.last_name).localeCompare(str(b.last_name), 'sk')
      if (!a.last_donation_date) return 1
      if (!b.last_donation_date) return -1
      return a.last_donation_date.localeCompare(b.last_donation_date) * dir
    }
    case 'variable_symbol':
      return (Number(a.variable_symbol) || 0) - (Number(b.variable_symbol) || 0) === 0
        ? str(a.variable_symbol).localeCompare(str(b.variable_symbol), 'sk') * dir
        : ((Number(a.variable_symbol) || 0) - (Number(b.variable_symbol) || 0)) * dir
    case 'status':
      return str(a.status).localeCompare(str(b.status), 'sk') * dir
    case 'email':
      return str(a.email).localeCompare(str(b.email), 'sk') * dir
    default: {
      const byLast = str(a.last_name).localeCompare(str(b.last_name), 'sk')
      return (byLast !== 0 ? byLast : str(a.first_name).localeCompare(str(b.first_name), 'sk')) * dir
    }
  }
}

/**
 * Načíta darcov podľa filtrov. `all = true` vráti všetky riadky (export),
 * inak jednu stránku. Radenie podľa súčtu darov a posledného daru sa počíta
 * v pamäti (nie sú to stĺpce tabuľky).
 */
export async function fetchDonorList(params: DonorListParams, opts: { all?: boolean } = {}): Promise<{ donors: DonorListRow[]; count: number }> {
  const supabase = await createClient()
  const inMemorySort = params.sortBy === 'total_donated' || params.sortBy === 'last_donation'
  const fetchAll = opts.all || inMemorySort

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('donors').select(
    `
      *,
      parishes ( name ),
      donor_projects${params.project !== 'all' ? '!inner' : ''} ( project_id ),
      donations${params.from || params.to ? '!inner' : ''} ( amount, donation_date )
    `,
    { count: 'exact' }
  )

  if (params.q) {
    const s = sanitizeSearchTerm(params.q)
    if (s) query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,variable_symbol.ilike.%${s}%`)
  }
  if (params.status !== 'all') query = query.eq('status', params.status)
  if (params.parish !== 'all') query = query.eq('parish_id', params.parish)
  if (params.project !== 'all') query = query.eq('donor_projects.project_id', params.project)
  if (params.from) query = query.gte('donations.donation_date', params.from)
  if (params.to) query = query.lte('donations.donation_date', params.to)

  if (params.selected === 'marked') {
    query = params.ids.length ? query.in('id', params.ids) : query.eq('id', '00000000-0000-0000-0000-000000000000')
  } else if (params.selected === 'unmarked' && params.ids.length) {
    query = query.not('id', 'in', `(${params.ids.join(',')})`)
  }

  const asc = params.sortOrder === 'asc'
  if (!fetchAll) {
    if (params.sortBy === 'variable_symbol') query = query.order('variable_symbol', { ascending: asc, nullsFirst: false })
    else if (params.sortBy === 'status') query = query.order('status', { ascending: asc })
    else if (params.sortBy === 'email') query = query.order('email', { ascending: asc, nullsFirst: false })
    else query = query.order('last_name', { ascending: asc }).order('first_name', { ascending: asc })
  }

  const from = (params.page - 1) * params.pageSize
  const to = from + params.pageSize - 1

  const res = fetchAll ? await query : await query.range(from, to)
  if (res.error) {
    console.error('[darcovia] fetchDonorList:', res.error.message)
    return { donors: [], count: 0 }
  }

  let rows = ((res.data ?? []) as RawDonor[]).map(mapRow)
  let count: number = fetchAll ? rows.length : (res.count ?? rows.length)

  if (fetchAll) {
    rows.sort((a, b) => compareRows(a, b, params.sortBy, asc))
    count = rows.length
    if (!opts.all) rows = rows.slice(from, from + params.pageSize)
  }

  return { donors: rows, count }
}
