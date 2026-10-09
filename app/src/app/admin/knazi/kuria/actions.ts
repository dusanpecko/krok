'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { clergyDisplayName } from '@/lib/clergy/types'
import { assignmentRoleText, personName, roleRank, slugify, type BodyKind, type DioceseBody } from '@/lib/diocese/bodies'

/**
 * Kúria, rady a komisie (051) – admin. Kňaz/diakon z registra = menovanie v clergy_assignments s body_id
 * (vidno ho aj v profile kňaza a v histórii), ostatní (laici, rehoľníci) = diocese_body_members.
 */

const VIEW = 'view_clergy'
const MANAGE = 'manage_clergy'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const db = () => createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Neznáma chyba')
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const BODY_COLUMNS = 'id, slug, name, name_genitive, kind, description, sort_order, published'

function refresh(bodyId?: string) {
  revalidatePath('/admin/knazi/kuria')
  if (bodyId) revalidatePath(`/admin/knazi/kuria/${bodyId}`)
  revalidatePath('/dcza/schematizmus/kuria')
}

async function log(clergyId: string, userId: string, action: string, changes: Record<string, unknown>) {
  await db().from('clergy_change_log').insert({ clergy_id: clergyId, user_id: userId, entity: 'assignment', action, changes })
}

// ------------------------------------------------------------ zoznam a detail

export interface BodyListItem extends DioceseBody {
  members: number
}

export async function listBodies(): Promise<BodyListItem[]> {
  await requirePermission(VIEW)
  const client = db()
  const [{ data: bodies }, { data: asg }, { data: ext }] = await Promise.all([
    client.from('diocese_bodies').select(BODY_COLUMNS).order('sort_order'),
    client.from('clergy_assignments').select('body_id').not('body_id', 'is', null).is('date_to', null).is('year_to', null),
    client.from('diocese_body_members').select('body_id').is('date_to', null),
  ])
  const count = new Map<string, number>()
  for (const r of [...(asg ?? []), ...(ext ?? [])]) count.set(r.body_id, (count.get(r.body_id) ?? 0) + 1)
  return ((bodies ?? []) as DioceseBody[]).map((b) => ({ ...b, members: count.get(b.id) ?? 0 }))
}

export interface BodyMember {
  type: 'clergy' | 'external'
  id: string // menovanie alebo člen mimo registra
  clergy_id: string | null
  name: string
  sort_name: string
  body_role: string
  note: string | null
  date_from: string | null
  date_to: string | null
}

export interface BodyDetail {
  body: DioceseBody
  current: BodyMember[]
  former: BodyMember[]
  clergyOptions: { id: string; label: string }[]
}

export async function getBody(id: string): Promise<BodyDetail | null> {
  await requirePermission(VIEW)
  const client = db()
  const { data: body } = await client.from('diocese_bodies').select(BODY_COLUMNS).eq('id', id).maybeSingle()
  if (!body) return null
  const [{ data: asg }, { data: ext }, { data: clergy }] = await Promise.all([
    client
      .from('clergy_assignments')
      .select('id, clergy_id, role, body_role, date_from, date_to, year_from, year_to, clergy:clergy_id(first_name, last_name, title_before, title_after, status)')
      .eq('body_id', id),
    client.from('diocese_body_members').select('*').eq('body_id', id),
    client.from('clergy').select('id, first_name, last_name, title_before, title_after, category, status').in('status', ['active', 'retired', 'studying']).order('last_name'),
  ])
  type AsgRow = { id: string; clergy_id: string; role: string; body_role: string | null; date_from: string | null; date_to: string | null; year_from: number | null; year_to: number | null; clergy: { first_name: string; last_name: string; title_before: string | null; title_after: string | null; status: string } | null }
  const members: BodyMember[] = [
    ...((asg ?? []) as unknown as AsgRow[]).map((a) => ({
      type: 'clergy' as const,
      id: a.id,
      clergy_id: a.clergy_id,
      name: a.clergy ? clergyDisplayName(a.clergy) : '—',
      sort_name: a.clergy?.last_name ?? '',
      body_role: a.body_role || a.role,
      note: a.clergy?.status === 'retired' ? 'na odpočinku' : null,
      date_from: a.date_from ?? (a.year_from ? String(a.year_from) : null),
      date_to: a.date_to ?? (a.year_to ? String(a.year_to) : null),
    })),
    ...(ext ?? []).map((m) => ({
      type: 'external' as const,
      id: m.id,
      clergy_id: null,
      name: personName(m),
      sort_name: m.last_name,
      body_role: m.body_role,
      note: m.affiliation,
      date_from: m.date_from,
      date_to: m.date_to,
    })),
  ].sort((a, b) => roleRank(a.body_role) - roleRank(b.body_role) || a.sort_name.localeCompare(b.sort_name, 'sk'))
  return {
    body: body as DioceseBody,
    current: members.filter((m) => !m.date_to),
    former: members.filter((m) => m.date_to).sort((a, b) => (b.date_to ?? '').localeCompare(a.date_to ?? '')),
    clergyOptions: (clergy ?? []).map((c) => ({ id: c.id, label: `${clergyDisplayName(c)}${c.status === 'retired' ? ' (na odpočinku)' : c.status === 'studying' ? ' (štúdium)' : ''}` })),
  }
}

// ------------------------------------------------------------ orgán

export interface BodyInput {
  name: string
  name_genitive?: string | null
  kind: BodyKind
  description?: string | null
  sort_order?: number | null
  published?: boolean
}

export async function saveBody(id: string | null, input: BodyInput): Promise<Result<{ id: string }>> {
  try {
    await requirePermission(MANAGE)
    const name = input.name?.trim()
    if (!name) return { success: false, error: 'Zadajte názov.' }
    if (!['kuria', 'rada', 'usek'].includes(input.kind)) return { success: false, error: 'Neplatný druh.' }
    const client = db()
    const row = {
      name,
      name_genitive: input.name_genitive?.trim() || null,
      kind: input.kind,
      description: input.description?.trim() || null,
      published: input.published ?? true,
      updated_at: new Date().toISOString(),
    }
    if (!id) {
      const { data: last } = await client.from('diocese_bodies').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
      let slug = slugify(name)
      const { data: taken } = await client.from('diocese_bodies').select('slug').like('slug', `${slug}%`)
      if (taken?.some((t) => t.slug === slug)) slug = `${slug}-${(taken?.length ?? 0) + 1}`
      const { data, error } = await client.from('diocese_bodies').insert({ ...row, slug, sort_order: input.sort_order ?? (last?.sort_order ?? 0) + 10 }).select('id').single()
      if (error) return { success: false, error: error.message }
      refresh()
      return { success: true, id: data.id }
    }
    const { error } = await client.from('diocese_bodies').update({ ...row, ...(input.sort_order != null ? { sort_order: input.sort_order } : {}) }).eq('id', id)
    if (error) return { success: false, error: error.message }
    // premenovanie → aktuálne funkcie kňazov v registri dostanú nový text
    const { data: asg } = await client.from('clergy_assignments').select('id, body_role').eq('body_id', id).is('date_to', null).is('year_to', null)
    for (const a of asg ?? []) if (a.body_role) await client.from('clergy_assignments').update({ role: assignmentRoleText(a.body_role, row), organization: name }).eq('id', a.id)
    refresh(id)
    return { success: true, id }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function deleteBody(id: string): Promise<Result> {
  try {
    await requirePermission(MANAGE)
    // menovania kňazov ostanú v histórii registra (body_id → null), členovia mimo registra sa zmažú
    const { error } = await db().from('diocese_bodies').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    refresh()
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function moveBody(id: string, dir: -1 | 1): Promise<Result> {
  try {
    await requirePermission(MANAGE)
    const client = db()
    const { data: b } = await client.from('diocese_bodies').select('id, kind').eq('id', id).maybeSingle()
    if (!b) return { success: false, error: 'Orgán neexistuje.' }
    const { data: list } = await client.from('diocese_bodies').select('id, sort_order').eq('kind', b.kind).order('sort_order')
    const arr = list ?? []
    const i = arr.findIndex((x) => x.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return { success: true }
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    const base = arr.reduce((m, x) => Math.min(m, x.sort_order), Infinity)
    for (const [k, x] of arr.entries()) await client.from('diocese_bodies').update({ sort_order: base + k * 10 }).eq('id', x.id)
    refresh()
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

// ------------------------------------------------------------ členovia

async function loadBody(id: string) {
  const { data } = await db().from('diocese_bodies').select('id, name, name_genitive, kind').eq('id', id).maybeSingle()
  return data as Pick<DioceseBody, 'id' | 'name' | 'name_genitive' | 'kind'> | null
}

export async function addClergyMember(bodyId: string, input: { clergy_id: string; body_role: string; date_from?: string | null; note?: string | null }): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const body = await loadBody(bodyId)
    if (!body) return { success: false, error: 'Orgán neexistuje.' }
    if (!input.clergy_id) return { success: false, error: 'Vyberte kňaza z registra.' }
    const bodyRole = input.body_role?.trim() || 'člen'
    const dateFrom = input.date_from?.trim() || null
    if (dateFrom && !DATE_RE.test(dateFrom)) return { success: false, error: 'Dátum má tvar RRRR-MM-DD.' }
    const client = db()
    const { data: dup } = await client.from('clergy_assignments').select('id').eq('body_id', bodyId).eq('clergy_id', input.clergy_id).is('date_to', null).is('year_to', null).limit(1)
    if (dup?.length) return { success: false, error: 'Tento kňaz už je aktuálnym členom.' }
    const role = assignmentRoleText(bodyRole, body)
    const { error } = await client.from('clergy_assignments').insert({
      clergy_id: input.clergy_id,
      kind: 'diocese',
      role,
      organization: body.name,
      body_id: bodyId,
      body_role: bodyRole,
      date_from: dateFrom,
      year_from: dateFrom ? Number(dateFrom.slice(0, 4)) : null,
      is_primary: false,
      note: input.note?.trim() || null,
      source: 'admin',
    })
    if (error) return { success: false, error: error.message }
    await log(input.clergy_id, user.id, 'create', { role, body: body.name, date_from: dateFrom })
    revalidatePath(`/admin/knazi/${input.clergy_id}`)
    refresh(bodyId)
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export interface ExternalMemberInput {
  title_before?: string | null
  first_name?: string | null
  last_name: string
  title_after?: string | null
  affiliation?: string | null
  body_role: string
  date_from?: string | null
}

export async function addExternalMember(bodyId: string, input: ExternalMemberInput): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    if (!input.last_name?.trim()) return { success: false, error: 'Zadajte priezvisko.' }
    const dateFrom = input.date_from?.trim() || null
    if (dateFrom && !DATE_RE.test(dateFrom)) return { success: false, error: 'Dátum má tvar RRRR-MM-DD.' }
    const { error } = await db().from('diocese_body_members').insert({
      body_id: bodyId,
      title_before: input.title_before?.trim() || null,
      first_name: input.first_name?.trim() || null,
      last_name: input.last_name.trim(),
      title_after: input.title_after?.trim() || null,
      affiliation: input.affiliation?.trim() || null,
      body_role: input.body_role?.trim() || 'člen',
      date_from: dateFrom,
      created_by: user.id,
    })
    if (error) return { success: false, error: error.message }
    refresh(bodyId)
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

export async function updateMemberRole(bodyId: string, type: BodyMember['type'], id: string, bodyRole: string): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const r = bodyRole.trim() || 'člen'
    const client = db()
    if (type === 'external') {
      const { error } = await client.from('diocese_body_members').update({ body_role: r, updated_at: new Date().toISOString() }).eq('id', id).eq('body_id', bodyId)
      if (error) return { success: false, error: error.message }
    } else {
      const body = await loadBody(bodyId)
      if (!body) return { success: false, error: 'Orgán neexistuje.' }
      const { data: a, error } = await client
        .from('clergy_assignments')
        .update({ body_role: r, role: assignmentRoleText(r, body), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('body_id', bodyId)
        .select('clergy_id')
        .single()
      if (error) return { success: false, error: error.message }
      await log(a.clergy_id, user.id, 'update', { body: body.name, body_role: r })
      revalidatePath(`/admin/knazi/${a.clergy_id}`)
    }
    refresh(bodyId)
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

/** Ukončenie členstva – kňazovi ostane v histórii pôsobenia. */
export async function endMember(bodyId: string, type: BodyMember['type'], id: string, dateTo: string): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    if (!DATE_RE.test(dateTo)) return { success: false, error: 'Dátum má tvar RRRR-MM-DD.' }
    const client = db()
    const patch = { date_to: dateTo, updated_at: new Date().toISOString() }
    if (type === 'external') {
      const { error } = await client.from('diocese_body_members').update(patch).eq('id', id).eq('body_id', bodyId)
      if (error) return { success: false, error: error.message }
    } else {
      const { data: a, error } = await client.from('clergy_assignments').update({ ...patch, year_to: Number(dateTo.slice(0, 4)) }).eq('id', id).eq('body_id', bodyId).select('clergy_id, role').single()
      if (error) return { success: false, error: error.message }
      await log(a.clergy_id, user.id, 'end', { assignment_id: id, role: a.role, date_to: dateTo })
      revalidatePath(`/admin/knazi/${a.clergy_id}`)
    }
    refresh(bodyId)
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}

/** Zmazanie – len pri chybnom zázname (inak členstvo ukončiť). */
export async function deleteMember(bodyId: string, type: BodyMember['type'], id: string): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const client = db()
    if (type === 'external') {
      const { error } = await client.from('diocese_body_members').delete().eq('id', id).eq('body_id', bodyId)
      if (error) return { success: false, error: error.message }
    } else {
      const { data: a } = await client.from('clergy_assignments').select('clergy_id, role').eq('id', id).eq('body_id', bodyId).maybeSingle()
      if (!a) return { success: false, error: 'Záznam neexistuje.' }
      const { error } = await client.from('clergy_assignments').delete().eq('id', id)
      if (error) return { success: false, error: error.message }
      await log(a.clergy_id, user.id, 'delete', { role: a.role })
      revalidatePath(`/admin/knazi/${a.clergy_id}`)
    }
    refresh(bodyId)
    return { success: true }
  } catch (err) {
    return { success: false, error: errorMessage(err) }
  }
}
