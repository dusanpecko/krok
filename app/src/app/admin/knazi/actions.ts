'use server'

import * as ExcelJS from 'exceljs'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import {
  CATEGORY_LABEL,
  CLERGY_EDIT_FIELDS,
  STATUS_LABEL,
  clergyDisplayName,
  isCurrent,
  seminaryYear,
  seminaryYearLabel,
  type AssignmentKind,
  type ClergyAssignment,
  type ClergyCategory,
  type ClergyListItem,
  type ClergyRecord,
  type ClergyStatus,
} from '@/lib/clergy/types'
import { assignmentRoleText, type BodyKind } from '@/lib/diocese/bodies'
import { KIND_LABEL as ANNIVERSARY_LABEL, computeAnniversaries, dayLabel, type AnniversaryPerson } from '@/lib/clergy/anniversaries'

/**
 * Schematizmus kňazov – admin (krok_navrh_farnosti.md § 16, fáza K1).
 * Čítanie `view_clergy`, úpravy `manage_clergy` – zatiaľ len KROK a kúria (O46).
 * Register je zdroj pravdy o pôsobení kňazov (O49); každá zmena ide do clergy_change_log.
 */

const VIEW = 'view_clergy'
const MANAGE = 'manage_clergy'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const db = () => createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Neznáma chyba'
}

const ASSIGNMENT_COLUMNS =
  'id, kind, role, parish_id, deanery_id, organization, body_id, body_role, date_from, date_to, year_from, year_to, is_primary, note, source, parishes(name), deaneries(name)'

type AssignmentRow = Omit<ClergyAssignment, 'parish_name' | 'deanery_name'> & {
  parishes: { name: string } | { name: string }[] | null
  deaneries: { name: string } | { name: string }[] | null
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

function mapAssignment(a: AssignmentRow): ClergyAssignment {
  const { parishes, deaneries, ...rest } = a
  return { ...rest, parish_name: one(parishes)?.name ?? null, deanery_name: one(deaneries)?.name ?? null }
}

/** Hlavné aktuálne pôsobenie: označené ako hlavné, inak prvé farské, inak prvé aktuálne. */
function primaryOf(list: ClergyAssignment[]): ClergyAssignment | null {
  const cur = list.filter(isCurrent)
  return cur.find((a) => a.is_primary) ?? cur.find((a) => a.kind === 'parish') ?? cur[0] ?? null
}

// ------------------------------------------------------------ zoznam

export async function listClergy(): Promise<ClergyListItem[]> {
  await requirePermission(VIEW)
  const { data, error } = await db()
    .from('clergy')
    .select(`id, first_name, last_name, title_before, title_after, category, status, personal_number, seminary_entry_year, seminary_year_offset, work_email, phones, religious_orders(code), clergy_assignments(${ASSIGNMENT_COLUMNS})`)
    .order('last_name')
    .order('first_name')
  if (error) throw new Error(error.message)

  return (data ?? []).map((c) => {
    const asg = ((c.clergy_assignments ?? []) as unknown as AssignmentRow[]).map(mapAssignment)
    const p = primaryOf(asg)
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      title_before: c.title_before,
      title_after: c.title_after,
      category: c.category as ClergyCategory,
      status: c.status as ClergyStatus,
      personal_number: c.personal_number,
      religious_order: one(c.religious_orders as { code: string } | { code: string }[] | null)?.code ?? null,
      seminary_entry_year: c.seminary_entry_year,
      seminary_year_offset: c.seminary_year_offset ?? 0,
      work_email: c.work_email,
      phones: c.phones ?? [],
      primary_role: p?.role ?? null,
      primary_place: p ? p.parish_name ?? p.organization ?? p.deanery_name : null,
      primary_parish_id: p?.parish_id ?? null,
      deanery_id: p?.deanery_id ?? null,
      deanery_name: p?.deanery_name ?? null,
    }
  })
}

// ------------------------------------------------------------ detail

export interface ClergyChangeRow {
  id: string
  entity: string
  action: string
  changes: Record<string, unknown>
  created_at: string
  user_email: string | null
}

export interface ClergyDetail {
  person: ClergyRecord
  assignments: ClergyAssignment[]
  log: ClergyChangeRow[]
  lookups: {
    orders: { id: string; code: string }[]
    ordainers: { id: string; name: string }[]
    parishes: { id: string; name: string; deanery_id: string | null }[]
    deaneries: { id: string; name: string }[]
    bodies: { id: string; name: string; name_genitive: string | null; kind: BodyKind }[]
  }
}

export async function getClergy(id: string): Promise<ClergyDetail | null> {
  await requirePermission(VIEW)
  const client = db()
  const { data: person } = await client.from('clergy').select('*').eq('id', id).maybeSingle()
  if (!person) return null

  const [{ data: asg }, { data: log }, { data: orders }, { data: ordainers }, { data: parishes }, { data: deaneries }, { data: bodies }] = await Promise.all([
    client.from('clergy_assignments').select(ASSIGNMENT_COLUMNS).eq('clergy_id', id),
    client.from('clergy_change_log').select('id, entity, action, changes, created_at, user_id').eq('clergy_id', id).order('created_at', { ascending: false }).limit(100),
    client.from('religious_orders').select('id, code').order('code'),
    client.from('ordainers').select('id, name').order('name'),
    client.from('parishes').select('id, name, deanery_id').eq('is_active', true).order('name'),
    client.from('deaneries').select('id, name').order('name'),
    client.from('diocese_bodies').select('id, name, name_genitive, kind').order('kind').order('sort_order'),
  ])

  const assignments = ((asg ?? []) as unknown as AssignmentRow[]).map(mapAssignment).sort((a, b) => {
    const cur = Number(isCurrent(b)) - Number(isCurrent(a))
    if (cur) return cur
    return (b.year_from ?? Number(b.date_from?.slice(0, 4) ?? 0)) - (a.year_from ?? Number(a.date_from?.slice(0, 4) ?? 0))
  })

  const emails = new Map<string, string | null>()
  for (const uid of [...new Set((log ?? []).map((l) => l.user_id).filter(Boolean))] as string[]) {
    const { data: u } = await client.auth.admin.getUserById(uid)
    emails.set(uid, u?.user?.email ?? null)
  }

  return {
    person: person as ClergyRecord,
    assignments,
    log: (log ?? []).map((l) => ({ id: l.id, entity: l.entity, action: l.action, changes: l.changes ?? {}, created_at: l.created_at, user_email: l.user_id ? emails.get(l.user_id) ?? null : null })),
    lookups: { orders: orders ?? [], ordainers: ordainers ?? [], parishes: parishes ?? [], deaneries: deaneries ?? [], bodies: (bodies ?? []) as ClergyDetail['lookups']['bodies'] },
  }
}

// ------------------------------------------------------------ úpravy osoby

const DATE_FIELDS = new Set(['birth_date', 'baptism_date', 'confirmation_date', 'diaconate_date', 'ordination_date', 'in_diocese_from', 'in_diocese_to', 'death_date'])
const INT_FIELDS = new Set(['seminary_entry_year', 'seminary_year_offset', 'theology_from', 'theology_to'])
const ARRAY_FIELDS = new Set(['ecclesiastical_titles', 'languages', 'phones'])

function normalizeField(field: string, value: unknown): { value: unknown; error?: string } {
  if (ARRAY_FIELDS.has(field)) {
    const arr = Array.isArray(value) ? value : String(value ?? '').split(/[,;\n]/)
    return { value: arr.map((x) => String(x).trim()).filter(Boolean) }
  }
  const s = value == null ? '' : String(value).trim()
  if (field === 'seminary_year_offset') return { value: s ? Number(s) || 0 : 0 }
  if (!s) return { value: null }
  if (DATE_FIELDS.has(field)) return /^\d{4}-\d{2}-\d{2}$/.test(s) ? { value: s } : { value: null, error: 'Dátum má tvar RRRR-MM-DD.' }
  if (INT_FIELDS.has(field)) return Number.isInteger(Number(s)) ? { value: Number(s) } : { value: null, error: 'Zadajte celé číslo.' }
  if (field === 'name_day') {
    const m = s.match(/^(\d{1,2})[.-](\d{1,2})\.?$/)
    return m ? { value: `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` } : { value: null, error: 'Meniny v tvare MM-DD (napr. 11-11).' }
  }
  if (field === 'work_email' || field === 'private_email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? { value: s.toLowerCase() } : { value: null, error: 'Neplatný e-mail.' }
  if (field === 'category' && !(s in CATEGORY_LABEL)) return { value: null, error: 'Neplatná kategória.' }
  if (field === 'status' && !(s in STATUS_LABEL)) return { value: null, error: 'Neplatný stav.' }
  if (field === 'slug') return { value: s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
  return { value: s }
}

async function log(clergyId: string | null, userId: string, entity: string, action: string, changes: Record<string, unknown>) {
  await db().from('clergy_change_log').insert({ clergy_id: clergyId, user_id: userId, entity, action, changes })
}

export async function updateClergy(id: string, patch: Record<string, unknown>): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const client = db()
    const { data: before } = await client.from('clergy').select('*').eq('id', id).maybeSingle()
    if (!before) return { success: false, error: 'Osoba sa nenašla.' }

    const update: Record<string, unknown> = {}
    const changes: Record<string, [unknown, unknown]> = {}
    for (const [field, raw] of Object.entries(patch)) {
      if (!(CLERGY_EDIT_FIELDS as readonly string[]).includes(field)) continue
      const { value, error } = normalizeField(field, raw)
      if (error) return { success: false, error: `${field}: ${error}` }
      if (JSON.stringify(value) !== JSON.stringify(before[field] ?? (ARRAY_FIELDS.has(field) ? [] : null))) {
        update[field] = value
        changes[field] = [before[field] ?? null, value]
      }
    }
    if ('first_name' in update && !update.first_name) return { success: false, error: 'Meno je povinné.' }
    if ('last_name' in update && !update.last_name) return { success: false, error: 'Priezvisko je povinné.' }
    if (!Object.keys(update).length) return { success: true }

    const { error } = await client.from('clergy').update({ ...update, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { success: false, error: error.code === '23505' ? 'Osobné číslo alebo verejná adresa už patrí inej osobe.' : error.message }
    await log(id, user.id, 'clergy', 'update', changes)
    revalidatePath(`/admin/knazi/${id}`)
    revalidatePath('/admin/knazi')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function createClergy(input: { first_name: string; last_name: string; category: ClergyCategory; seminary_entry_year?: number | null }): Promise<Result<{ id: string }>> {
  try {
    const { user } = await requirePermission(MANAGE)
    const first = input.first_name?.trim(), last = input.last_name?.trim()
    if (!first || !last) return { success: false, error: 'Meno a priezvisko sú povinné.' }
    if (!(input.category in CATEGORY_LABEL)) return { success: false, error: 'Neplatná kategória.' }
    const { data, error } = await db()
      .from('clergy')
      .insert({ first_name: first, last_name: last, category: input.category, status: 'active', seminary_entry_year: input.category === 'seminarian' ? input.seminary_entry_year ?? null : null, source: 'admin' })
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    await log(data.id, user.id, 'clergy', 'create', { name: `${first} ${last}`, category: input.category })
    revalidatePath('/admin/knazi')
    return { success: true, id: data.id }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

/**
 * Zmena stavu (O45): bohoslovec → diakon → kňaz s dátumom, miestom a svätiteľom
 * (zapíše sa diakonát / presbyterát), prípadne iná zmena kategórie bez svätenia.
 */
export async function promoteClergy(
  id: string,
  input: { category: ClergyCategory; date?: string | null; place?: string | null; ordainer_id?: string | null }
): Promise<Result> {
  const patch: Record<string, unknown> = { category: input.category, status: 'active' }
  if (input.category === 'deacon' || input.category === 'permanent_deacon') {
    Object.assign(patch, { diaconate_date: input.date ?? null, diaconate_place: input.place ?? null, diaconate_ordainer_id: input.ordainer_id ?? null })
  }
  if (input.category === 'priest') {
    Object.assign(patch, { ordination_date: input.date ?? null, ordination_place: input.place ?? null, ordination_ordainer_id: input.ordainer_id ?? null })
  }
  const res = await updateClergy(id, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)))
  return res
}

// ------------------------------------------------------------ pôsobenie

export interface AssignmentInput {
  kind: AssignmentKind
  role: string
  parish_id?: string | null
  deanery_id?: string | null
  organization?: string | null
  body_id?: string | null // rada, komisia, úrad kúrie (051) – funkcia = funkcia v orgáne (člen, predseda…)
  date_from?: string | null
  is_primary?: boolean
  note?: string | null
}

/**
 * Nové menovanie (O49): pridá aktuálne pôsobenie; voliteľne ukončí doterajšie hlavné pôsobenie
 * ku dňu pred nástupom. Stránky farností ukážu zmenu automaticky (fáza K3).
 */
export async function addAssignment(clergyId: string, input: AssignmentInput, endPrevious: boolean): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    let role = input.role?.trim()
    if (!role) return { success: false, error: 'Zadajte funkciu.' }
    if (input.kind === 'parish' && !input.parish_id) return { success: false, error: 'Vyberte farnosť.' }
    const dateFrom = input.date_from?.trim() || null
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) return { success: false, error: 'Dátum nástupu má tvar RRRR-MM-DD.' }

    const client = db()
    const bodyId = input.kind === 'diocese' ? input.body_id || null : null
    let bodyRole: string | null = null
    let organization = input.kind === 'parish' ? null : input.organization?.trim() || null
    if (bodyId) {
      const { data: body } = await client.from('diocese_bodies').select('name, name_genitive, kind').eq('id', bodyId).maybeSingle()
      if (!body) return { success: false, error: 'Orgán neexistuje.' }
      bodyRole = role
      role = assignmentRoleText(role, body)
      organization = body.name
    }
    let deaneryId = input.deanery_id || null
    if (input.kind === 'parish' && input.parish_id) {
      const { data: p } = await client.from('parishes').select('deanery_id').eq('id', input.parish_id).maybeSingle()
      deaneryId = p?.deanery_id ?? deaneryId
    }

    const ended: string[] = []
    if (endPrevious) {
      const { data: current } = await client.from('clergy_assignments').select('id, role, is_primary, kind').eq('clergy_id', clergyId).is('date_to', null).is('year_to', null)
      const toEnd = (current ?? []).filter((a) => a.is_primary || (input.kind === 'parish' && a.kind === 'parish'))
      const endDate = dateFrom ? new Date(new Date(`${dateFrom}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      for (const a of toEnd) {
        await client.from('clergy_assignments').update({ date_to: endDate, is_primary: false, updated_at: new Date().toISOString() }).eq('id', a.id)
        ended.push(a.role)
      }
    }
    if (input.is_primary) await client.from('clergy_assignments').update({ is_primary: false }).eq('clergy_id', clergyId).eq('is_primary', true)

    const { error } = await client.from('clergy_assignments').insert({
      clergy_id: clergyId,
      kind: input.kind,
      role,
      parish_id: input.kind === 'parish' ? input.parish_id : null,
      deanery_id: deaneryId,
      organization,
      body_id: bodyId,
      body_role: bodyRole,
      date_from: dateFrom,
      year_from: dateFrom ? Number(dateFrom.slice(0, 4)) : null,
      is_primary: !!input.is_primary,
      note: input.note?.trim() || null,
      source: 'admin',
    })
    if (error) return { success: false, error: error.message }
    await log(clergyId, user.id, 'assignment', 'create', { role, kind: input.kind, parish_id: input.parish_id ?? null, date_from: dateFrom, ended })
    revalidatePath(`/admin/knazi/${clergyId}`)
    revalidatePath('/admin/knazi')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export interface AssignmentEdit {
  kind: AssignmentKind
  role: string
  parish_id?: string | null
  deanery_id?: string | null
  organization?: string | null
  body_id?: string | null
  /** „2015“ alebo „2015-09-01“; prázdne = neznáme */
  from?: string | null
  /** prázdne = aktuálne pôsobenie */
  to?: string | null
  note?: string | null
}

/** „2015“ → len rok, „2015-09-01“ → dátum aj rok. */
function parsePeriod(v: string | null | undefined, label: string): { date: string | null; year: number | null } | string {
  const t = v?.trim() ?? ''
  if (!t) return { date: null, year: null }
  if (/^\d{4}$/.test(t)) return { date: null, year: Number(t) }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return { date: t, year: Number(t.slice(0, 4)) }
  return `${label} zadajte ako rok (2015) alebo dátum (2015-09-01).`
}

/** Oprava záznamu o pôsobení (preklep, zlá farnosť, obdobie…). */
export async function updateAssignment(clergyId: string, assignmentId: string, input: AssignmentEdit): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    let role = input.role?.trim()
    if (!role) return { success: false, error: 'Zadajte funkciu.' }
    if (input.kind === 'parish' && !input.parish_id) return { success: false, error: 'Vyberte farnosť.' }
    const from = parsePeriod(input.from, 'Začiatok')
    if (typeof from === 'string') return { success: false, error: from }
    const to = parsePeriod(input.to, 'Koniec')
    if (typeof to === 'string') return { success: false, error: to }
    if (from.year && to.year && to.year < from.year) return { success: false, error: 'Koniec je pred začiatkom.' }

    const client = db()
    const { data: before } = await client.from('clergy_assignments').select('*').eq('id', assignmentId).eq('clergy_id', clergyId).maybeSingle()
    if (!before) return { success: false, error: 'Záznam neexistuje.' }

    const bodyId = input.kind === 'diocese' ? input.body_id || null : null
    let bodyRole: string | null = null
    let organization = input.kind === 'parish' ? null : input.organization?.trim() || null
    if (bodyId) {
      const { data: body } = await client.from('diocese_bodies').select('name, name_genitive, kind').eq('id', bodyId).maybeSingle()
      if (!body) return { success: false, error: 'Orgán neexistuje.' }
      bodyRole = role
      role = assignmentRoleText(role, body)
      // pri nezmenenom orgáne ostáva pôvodná organizácia (napr. „Biskupský úrad“ pri ekonómovi)
      organization = bodyId === before.body_id && before.organization ? before.organization : body.name
    }
    let deaneryId = input.kind === 'deanery' ? input.deanery_id || null : before.deanery_id
    if (input.kind === 'parish' && input.parish_id) {
      const { data: p } = await client.from('parishes').select('deanery_id').eq('id', input.parish_id).maybeSingle()
      deaneryId = p?.deanery_id ?? null
    }
    const patch = {
      kind: input.kind,
      role,
      parish_id: input.kind === 'parish' ? input.parish_id : null,
      deanery_id: deaneryId,
      organization,
      body_id: bodyId,
      body_role: bodyRole,
      date_from: from.date,
      year_from: from.year,
      date_to: to.date,
      year_to: to.year,
      ...(to.year ? { is_primary: false } : {}),
      note: input.note?.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await client.from('clergy_assignments').update(patch).eq('id', assignmentId)
    if (error) return { success: false, error: error.message }
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    for (const [k, v] of Object.entries(patch)) if (k !== 'updated_at' && (before as Record<string, unknown>)[k] !== v) changes[k] = { from: (before as Record<string, unknown>)[k], to: v }
    await log(clergyId, user.id, 'assignment', 'update', { assignment_id: assignmentId, ...changes })
    revalidatePath(`/admin/knazi/${clergyId}`)
    revalidatePath('/admin/knazi')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function endAssignment(clergyId: string, assignmentId: string, dateTo: string): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) return { success: false, error: 'Dátum ukončenia má tvar RRRR-MM-DD.' }
    const { error } = await db()
      .from('clergy_assignments')
      .update({ date_to: dateTo, year_to: Number(dateTo.slice(0, 4)), is_primary: false, updated_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('clergy_id', clergyId)
    if (error) return { success: false, error: error.message }
    await log(clergyId, user.id, 'assignment', 'end', { assignment_id: assignmentId, date_to: dateTo })
    revalidatePath(`/admin/knazi/${clergyId}`)
    revalidatePath('/admin/knazi')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function deleteAssignment(clergyId: string, assignmentId: string): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const client = db()
    const { data: a } = await client.from('clergy_assignments').select('role, kind, parish_id, year_from, year_to, date_from, date_to').eq('id', assignmentId).eq('clergy_id', clergyId).maybeSingle()
    if (!a) return { success: false, error: 'Pôsobenie sa nenašlo.' }
    const { error } = await client.from('clergy_assignments').delete().eq('id', assignmentId)
    if (error) return { success: false, error: error.message }
    await log(clergyId, user.id, 'assignment', 'delete', a)
    revalidatePath(`/admin/knazi/${clergyId}`)
    revalidatePath('/admin/knazi')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function setPrimaryAssignment(clergyId: string, assignmentId: string): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const client = db()
    await client.from('clergy_assignments').update({ is_primary: false }).eq('clergy_id', clergyId)
    const { error } = await client.from('clergy_assignments').update({ is_primary: true }).eq('id', assignmentId).eq('clergy_id', clergyId)
    if (error) return { success: false, error: error.message }
    await log(clergyId, user.id, 'assignment', 'primary', { assignment_id: assignmentId })
    revalidatePath(`/admin/knazi/${clergyId}`)
    revalidatePath('/admin/knazi')
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

// ------------------------------------------------------------ export (O51)

export async function exportClergyXlsx(scope: 'active' | 'all'): Promise<Result<{ fileName: string; base64: string }>> {
  try {
    await requirePermission(VIEW)
    const client = db()
    let q = client
      .from('clergy')
      .select(`*, religious_orders(code), diaconate_ordainer:ordainers!clergy_diaconate_ordainer_id_fkey(name), ordination_ordainer:ordainers!clergy_ordination_ordainer_id_fkey(name), clergy_assignments(${ASSIGNMENT_COLUMNS})`)
      .order('last_name')
      .order('first_name')
    if (scope === 'active') q = q.not('status', 'in', '(left,deceased)')
    const { data, error } = await q
    if (error) return { success: false, error: error.message }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'KROK – schematizmus kňazov'
    const ws = wb.addWorksheet('Schematizmus', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = [
      { header: 'Osobné č.', key: 'pn', width: 9 },
      { header: 'Oslovenie', key: 'sal', width: 9 },
      { header: 'Meno s titulmi', key: 'name', width: 34 },
      { header: 'Priezvisko', key: 'last', width: 16 },
      { header: 'Meno', key: 'first', width: 14 },
      { header: 'Kategória', key: 'cat', width: 13 },
      { header: 'Stav', key: 'status', width: 14 },
      { header: 'Ročník', key: 'year', width: 14 },
      { header: 'Rehoľa', key: 'order', width: 9 },
      { header: 'Cirkevné tituly', key: 'eccl', width: 22 },
      { header: 'Funkcia', key: 'role', width: 22 },
      { header: 'Miesto pôsobenia', key: 'place', width: 28 },
      { header: 'Dekanát', key: 'deanery', width: 16 },
      { header: 'Pôsobí od', key: 'since', width: 10 },
      { header: 'Iné aktuálne funkcie', key: 'other', width: 40 },
      { header: 'Pracovný e-mail', key: 'we', width: 28 },
      { header: 'Súkromný e-mail', key: 'pe', width: 28 },
      { header: 'Telefón', key: 'phones', width: 24 },
      { header: 'Meniny', key: 'nd', width: 8 },
      { header: 'Dátum narodenia', key: 'bd', width: 12 },
      { header: 'Miesto narodenia', key: 'bp', width: 18 },
      { header: 'Pochádza', key: 'origin', width: 18 },
      { header: 'Trvalý pobyt', key: 'addr', width: 34 },
      { header: 'Diakonát', key: 'dd', width: 12 },
      { header: 'Diakonát – miesto', key: 'dp', width: 16 },
      { header: 'Diakonát – svätiteľ', key: 'do', width: 22 },
      { header: 'Kňazská vysviacka', key: 'od', width: 12 },
      { header: 'Vysviacka – miesto', key: 'op', width: 16 },
      { header: 'Vysviacka – svätiteľ', key: 'oo', width: 22 },
      { header: 'V ŽD od', key: 'zf', width: 12 },
      { header: 'V ŽD do', key: 'zt', width: 12 },
      { header: 'Úmrtie', key: 'death', width: 12 },
      { header: 'Jazyky', key: 'lang', width: 14 },
    ]
    ws.getRow(1).font = { bold: true }
    for (const c of data ?? []) {
      const asg = ((c.clergy_assignments ?? []) as unknown as AssignmentRow[]).map(mapAssignment)
      const p = primaryOf(asg)
      const others = asg.filter((a) => isCurrent(a) && a.id !== p?.id).map((a) => [a.role, a.parish_name ?? a.organization ?? a.deanery_name].filter(Boolean).join(' – '))
      const rel = <T,>(v: unknown) => one(v as T | T[] | null)
      ws.addRow({
        pn: c.personal_number ?? '',
        sal: c.salutation ?? '',
        name: clergyDisplayName(c),
        last: c.last_name,
        first: c.first_name,
        cat: CATEGORY_LABEL[c.category as ClergyCategory] ?? c.category,
        status: STATUS_LABEL[c.status as ClergyStatus] ?? c.status,
        year: c.category === 'seminarian' ? seminaryYearLabel(seminaryYear(c.seminary_entry_year, c.seminary_year_offset ?? 0)) : '',
        order: rel<{ code: string }>(c.religious_orders)?.code ?? '',
        eccl: (c.ecclesiastical_titles ?? []).join(', '),
        role: p?.role ?? '',
        place: p ? p.parish_name ?? p.organization ?? '' : '',
        deanery: p?.deanery_name ?? '',
        since: p ? p.date_from ?? p.year_from ?? '' : '',
        other: others.join('; '),
        we: c.work_email ?? '',
        pe: c.private_email ?? '',
        phones: (c.phones ?? []).join(', '),
        nd: c.name_day ?? '',
        bd: c.birth_date ?? '',
        bp: c.birth_place ?? '',
        origin: c.origin ?? '',
        addr: c.permanent_address ?? '',
        dd: c.diaconate_date ?? '',
        dp: c.diaconate_place ?? '',
        do: rel<{ name: string }>(c.diaconate_ordainer)?.name ?? '',
        od: c.ordination_date ?? '',
        op: c.ordination_place ?? '',
        oo: rel<{ name: string }>(c.ordination_ordainer)?.name ?? '',
        zf: c.in_diocese_from ?? '',
        zt: c.in_diocese_to ?? '',
        death: c.death_date ?? '',
        lang: (c.languages ?? []).join(', '),
      })
    }
    ws.autoFilter = { from: 'A1', to: 'AG1' }
    const buf = await wb.xlsx.writeBuffer()
    const date = new Date().toISOString().slice(0, 10)
    return { success: true, fileName: `schematizmus-knazov-${scope === 'all' ? 'vsetci' : 'v-sluzbe'}-${date}.xlsx`, base64: Buffer.from(buf).toString('base64') }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

// ------------------------------------------------------------ výročia a meniny (K2, § 16.5)

export async function getAnniversaryPeople(): Promise<AnniversaryPerson[]> {
  await requirePermission(VIEW)
  const { data, error } = await db()
    .from('clergy')
    .select(`id, first_name, last_name, title_before, title_after, status, birth_date, ordination_date, death_date, name_day, clergy_assignments(${ASSIGNMENT_COLUMNS})`)
    .in('category', ['priest', 'bishop', 'deacon', 'permanent_deacon'])
  if (error) throw new Error(error.message)
  return (data ?? []).map((c) => {
    const p = primaryOf(((c.clergy_assignments ?? []) as unknown as AssignmentRow[]).map(mapAssignment))
    return {
      id: c.id,
      name: clergyDisplayName(c),
      role: p?.role ?? null,
      place: p ? p.parish_name ?? p.organization ?? p.deanery_name : null,
      status: c.status,
      birth_date: c.birth_date,
      ordination_date: c.ordination_date,
      death_date: c.death_date,
      name_day: c.name_day,
    }
  })
}

export async function exportAnniversariesXlsx(year: number, month: number | null): Promise<Result<{ fileName: string; base64: string }>> {
  try {
    const people = await getAnniversaryPeople()
    const list = computeAnniversaries(people, year).filter((a) => month == null || Number(a.day.slice(0, 2)) === month)
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(`Výročia ${year}`, { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = [
      { header: 'Dátum', key: 'day', width: 9 },
      { header: 'Druh', key: 'kind', width: 20 },
      { header: 'Rokov', key: 'years', width: 7 },
      { header: 'Meno', key: 'name', width: 36 },
      { header: 'Funkcia', key: 'role', width: 22 },
      { header: 'Miesto', key: 'place', width: 30 },
    ]
    ws.getRow(1).font = { bold: true }
    for (const a of list) {
      const r = ws.addRow({ day: dayLabel(a.day), kind: ANNIVERSARY_LABEL[a.kind], years: a.years ?? '', name: a.person.name, role: a.person.role ?? '', place: a.person.place ?? '' })
      if (a.major) r.font = { bold: true }
    }
    const buf = await wb.xlsx.writeBuffer()
    return { success: true, fileName: `vyrocia-knazov-${year}${month ? '-' + String(month).padStart(2, '0') : ''}.xlsx`, base64: Buffer.from(buf).toString('base64') }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

// ------------------------------------------------------------ adresné štítky (K2)

export interface ClergyLabel {
  id: string
  lines: string[]
}

const CURIA_ADDRESS = ['Biskupský úrad Žilina', 'Jána Kalinčiaka 1', '010 01 Žilina']

/**
 * Štítky na hromadnú poštu: oslovenie + meno s titulmi, adresa hlavného pôsobenia (farský úrad),
 * pri kúrii adresa biskupského úradu, inak trvalý pobyt.
 */
export async function getClergyLabels(scope: 'service' | 'living', deaneryId: string | null): Promise<ClergyLabel[]> {
  await requirePermission(VIEW)
  const { data, error } = await db()
    .from('clergy')
    .select(`id, first_name, last_name, title_before, title_after, salutation, status, category, permanent_address, clergy_assignments(${ASSIGNMENT_COLUMNS})`)
    .in('status', scope === 'service' ? ['active'] : ['active', 'retired', 'studying'])
    .in('category', ['priest', 'bishop', 'deacon', 'permanent_deacon'])
    .order('last_name')
    .order('first_name')
  if (error) throw new Error(error.message)

  const people = (data ?? []).map((c) => ({ c, p: primaryOf(((c.clergy_assignments ?? []) as unknown as AssignmentRow[]).map(mapAssignment)) }))
  const filtered = deaneryId ? people.filter(({ p }) => p?.deanery_id === deaneryId) : people
  const parishIds = [...new Set(filtered.map(({ p }) => p?.parish_id).filter(Boolean))] as string[]
  const { data: parishes } = parishIds.length
    ? await db().from('parishes').select('id, name, official_name, street, postal_code, city').in('id', parishIds)
    : { data: [] as { id: string; name: string; official_name: string | null; street: string | null; postal_code: string | null; city: string | null }[] }
  const parishOf = new Map((parishes ?? []).map((p) => [p.id, p]))

  return filtered.map(({ c, p }) => {
    const nameLine = [c.salutation, clergyDisplayName(c)].filter(Boolean).join(' ')
    let address: string[] = []
    const parish = p?.parish_id ? parishOf.get(p.parish_id) : null
    if (parish) {
      address = [`Rímskokatolícka cirkev, ${parish.official_name ?? parish.name}`, parish.street ?? '', [parish.postal_code, parish.city].filter(Boolean).join(' ')]
    } else if (p && /biskupsk|kúri/i.test(`${p.organization ?? ''} ${p.role}`)) {
      address = CURIA_ADDRESS
    } else if (c.permanent_address) {
      address = c.permanent_address.split(',').map((x: string) => x.trim())
    }
    return { id: c.id, lines: [nameLine, ...address].filter(Boolean) }
  })
}
