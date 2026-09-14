'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requirePermission } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/storage'
import { generateSlug } from '@/lib/slug'
import { mapBudget, mapMedia, mapMilestone, mapProject, mapStats, num, numOrNull, type Raw } from '@/lib/projects/mappers'
import {
  EMPTY_STATS,
  isProjectCategory,
  isProjectStatus,
  type ActionResult,
  type BudgetItemInput,
  type MediaKind,
  type MediaPhase,
  type MilestoneInput,
  type ParishOption,
  type ProjectAdminDetail,
  type ProjectBudgetItem,
  type ProjectDonationsData,
  type ProjectListItem,
  type ProjectMedia,
  type ProjectMilestone,
  type ProjectOption,
  type ProjectPayload,
  type ProjectPostSummary,
  type ProjectStats,
} from '@/lib/projects/types'

/**
 * Admin akcie pre Výzvy na podporu (tabuľka projects + project_media,
 * project_budget_items, project_milestones). Oprávnenie: manage_projects.
 */

const PERMISSION = 'manage_projects'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel limituje telo requestu na ~4,5 MB
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const UPLOAD_KINDS = ['hero', 'guarantor', 'gallery', 'document', 'content'] as const
type UploadKind = (typeof UPLOAD_KINDS)[number]

// ------------------------------------------------------------
// Pomocníci
// ------------------------------------------------------------

function getB2KeyFromUrl(url?: string | null): string | null {
  if (!url) return null
  const bucketName = process.env.B2_BUCKET_NAME || 'parochia-storage-v1'
  const parts = url.split(bucketName + '/')
  return parts.length > 1 ? parts[1] : null
}

async function deleteB2ByUrl(url?: string | null): Promise<void> {
  const key = getB2KeyFromUrl(url)
  if (key) await deleteImage(key)
}

function text(v?: string | null): string | null {
  const t = v?.trim()
  return t ? t : null
}

function revalidateProject(id?: string, slug?: string | null) {
  revalidatePath('/admin/projekty')
  if (id) revalidatePath(`/admin/projekty/${id}`)
  revalidatePath('/admin/darcovia')
  revalidatePath('/')
  revalidatePath('/vyzvy')
  if (slug) revalidatePath(`/vyzvy/${slug}`)
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const { data } = await supabaseAdmin.from('projects').select('id, slug').like('slug', `${base}%`)
  const taken = new Set(
    (data ?? []).filter((r: { id: string }) => r.id !== excludeId).map((r: { slug: string }) => r.slug)
  )
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

// ------------------------------------------------------------
// Čítanie
// ------------------------------------------------------------

/** Zoznam všetkých projektov/výziev so živými štatistikami. */
export async function getProjectsForAdmin(): Promise<ProjectListItem[]> {
  await requirePermission(PERMISSION)

  const [projectsRes, statsRes, donorProjectsRes] = await Promise.all([
    supabaseAdmin.from('projects').select('*').order('sort_order', { ascending: true }).order('name'),
    supabaseAdmin.from('v_project_stats').select('*'),
    supabaseAdmin.from('donor_projects').select('project_id'),
  ])

  if (projectsRes.error) {
    console.error('[projekty] getProjectsForAdmin:', projectsRes.error.message)
    return []
  }

  const statsById = new Map<string, ProjectStats>()
  for (const s of (statsRes.data ?? []) as Raw[]) statsById.set(String(s.project_id), mapStats(s))

  const donorCounts = new Map<string, number>()
  for (const dp of (donorProjectsRes.data ?? []) as { project_id: string }[]) {
    donorCounts.set(dp.project_id, (donorCounts.get(dp.project_id) ?? 0) + 1)
  }

  return ((projectsRes.data ?? []) as Raw[]).map((r) => {
    const p = mapProject(r)
    return { ...p, stats: statsById.get(p.id) ?? EMPTY_STATS, donors_count: donorCounts.get(p.id) ?? 0 }
  })
}

/** Detail výzvy pre admin formulár (projekt + médiá, rozpočet, harmonogram, správy, štatistiky). */
export async function getProjectForAdmin(id: string): Promise<ProjectAdminDetail | null> {
  await requirePermission(PERMISSION)

  const { data: project, error } = await supabaseAdmin.from('projects').select('*').eq('id', id).maybeSingle()
  if (error || !project) return null

  const [statsRes, mediaRes, budgetRes, milestonesRes, postsRes] = await Promise.all([
    supabaseAdmin.from('v_project_stats').select('*').eq('project_id', id).maybeSingle(),
    supabaseAdmin.from('project_media').select('*').eq('project_id', id).order('kind').order('sort_order'),
    supabaseAdmin.from('project_budget_items').select('*').eq('project_id', id).order('sort_order'),
    supabaseAdmin.from('project_milestones').select('*').eq('project_id', id).order('sort_order'),
    supabaseAdmin
      .from('posts')
      .select('id, title, slug, status, published_at')
      .eq('project_id', id)
      .order('published_at', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false }),
  ])

  return {
    project: mapProject(project as Raw),
    stats: mapStats(statsRes.data as Raw | null),
    media: ((mediaRes.data ?? []) as Raw[]).map(mapMedia),
    budget: ((budgetRes.data ?? []) as Raw[]).map(mapBudget),
    milestones: ((milestonesRes.data ?? []) as Raw[]).map(mapMilestone),
    posts: (postsRes.data ?? []) as ProjectPostSummary[],
  }
}

/** Farnosti pre výber miesta realizácie. */
export async function getParishOptions(): Promise<ParishOption[]> {
  await requirePermission(PERMISSION)
  const { data } = await supabaseAdmin.from('parishes').select('id, name, city').order('name')
  return (data ?? []) as ParishOption[]
}

/** Zoznam projektov pre výber v iných moduloch (napr. článok naviazaný na výzvu). */
export async function getProjectOptions(): Promise<ProjectOption[]> {
  await requireAdmin()
  const { data } = await supabaseAdmin.from('projects').select('id, name').order('name')
  return (data ?? []) as ProjectOption[]
}

/** Dary, online platby a predplatné viazané na výzvu (záložka Dary). */
export async function getProjectDonations(projectId: string): Promise<ProjectDonationsData> {
  await requirePermission(PERMISSION)

  const [donationsRes, paymentsRes, subsRes] = await Promise.all([
    supabaseAdmin
      .from('donations')
      .select('id, amount, donation_date, payment_method, notes, donors(first_name, last_name, company_name, variable_symbol)')
      .eq('project_id', projectId)
      .order('donation_date', { ascending: false })
      .limit(300),
    supabaseAdmin
      .from('online_payments')
      .select('id, status, kind, amount, method, email, donor_name, created_at, paid_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(300),
    supabaseAdmin
      .from('online_subscriptions')
      .select('id, status, interval, amount, email, donor_name, started_at, next_payment_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ])

  type DonorRel = { first_name?: string | null; last_name?: string | null; company_name?: string | null; variable_symbol?: string | null }

  const donations = ((donationsRes.data ?? []) as Raw[]).map((d) => {
    const rel = d.donors as DonorRel | DonorRel[] | null
    const donor = Array.isArray(rel) ? rel[0] : rel
    const person = [donor?.first_name, donor?.last_name].filter(Boolean).join(' ')
    return {
      id: String(d.id),
      amount: num(d.amount),
      donation_date: String(d.donation_date),
      payment_method: String(d.payment_method ?? ''),
      notes: (d.notes as string | null) ?? null,
      donor_name: donor?.company_name || person || 'Neznámy darca',
      variable_symbol: donor?.variable_symbol ?? null,
    }
  })

  const payments = ((paymentsRes.data ?? []) as Raw[]).map((p) => ({
    id: String(p.id),
    status: String(p.status),
    kind: String(p.kind),
    amount: num(p.amount),
    method: (p.method as string | null) ?? null,
    email: (p.email as string | null) ?? null,
    donor_name: (p.donor_name as string | null) ?? null,
    created_at: String(p.created_at),
    paid_at: (p.paid_at as string | null) ?? null,
  }))

  const subscriptions = ((subsRes.data ?? []) as Raw[]).map((s) => ({
    id: String(s.id),
    status: String(s.status),
    interval: String(s.interval),
    amount: num(s.amount),
    email: (s.email as string | null) ?? null,
    donor_name: (s.donor_name as string | null) ?? null,
    started_at: (s.started_at as string | null) ?? null,
    next_payment_at: (s.next_payment_at as string | null) ?? null,
  }))

  return { donations, payments, subscriptions }
}

// ------------------------------------------------------------
// Zápis: výzva
// ------------------------------------------------------------

export async function saveProject(
  payload: ProjectPayload
): Promise<{ success: true; id: string; slug: string } | { success: false; error: string }> {
  await requirePermission(PERMISSION)

  const name = payload.name?.trim()
  if (!name) return { success: false, error: 'Názov výzvy je povinný.' }
  if (!isProjectCategory(payload.category)) return { success: false, error: 'Neplatná kategória.' }
  if (!isProjectStatus(payload.status)) return { success: false, error: 'Neplatný stav.' }

  const target = numOrNull(payload.target_amount)
  if (target !== null && target < 0) return { success: false, error: 'Cieľová suma nemôže byť záporná.' }

  let existing: Raw | null = null
  if (payload.id) {
    const { data } = await supabaseAdmin.from('projects').select('*').eq('id', payload.id).maybeSingle()
    if (!data) return { success: false, error: 'Výzva neexistuje.' }
    existing = data as Raw
  }

  const baseSlug = generateSlug(payload.slug?.trim() || name) || 'vyzva'
  const slug = existing && existing.slug === baseSlug ? baseSlug : await ensureUniqueSlug(baseSlug, payload.id)

  const nowIso = new Date().toISOString()
  const previousPublishedAt = (existing?.published_at as string | null) ?? null
  const publishedAt = payload.status === 'draft' ? previousPublishedAt : previousPublishedAt ?? nowIso

  const suggested = Array.from(
    new Set((payload.suggested_amounts ?? []).map((x) => Math.round(num(x))).filter((x) => x > 0))
  ).sort((a, b) => a - b)

  const dbPayload = {
    name,
    slug,
    subtitle: text(payload.subtitle),
    description: text(payload.description),
    content: text(payload.content),
    category: payload.category,
    status: payload.status,
    visible_on_web: !!payload.visible_on_web,
    featured: !!payload.featured,
    sort_order: Math.round(num(payload.sort_order)),
    image_url: text(payload.image_url),
    video_url: text(payload.video_url),
    closing_summary: text(payload.closing_summary),
    recipient_name: text(payload.recipient_name),
    recipient_address: text(payload.recipient_address),
    guarantor_name: text(payload.guarantor_name),
    guarantor_role: text(payload.guarantor_role),
    guarantor_photo_url: text(payload.guarantor_photo_url),
    parish_id: payload.parish_id || null,
    location: text(payload.location),
    target_amount: target,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
    specific_symbol: text(payload.specific_symbol),
    legacy_variable_symbol: text(payload.legacy_variable_symbol),
    legacy_collected_amount: Math.max(0, num(payload.legacy_collected_amount)),
    legacy_supporters_count: Math.max(0, Math.round(num(payload.legacy_supporters_count))),
    allow_one_time: payload.allow_one_time !== false,
    allow_recurring: payload.allow_recurring !== false,
    suggested_amounts: suggested.length ? suggested : [10, 20, 50, 100],
    published_at: publishedAt,
    updated_at: nowIso,
  }

  // Zmazať nahradené súbory z B2
  if (existing) {
    for (const col of ['image_url', 'guarantor_photo_url'] as const) {
      const old = existing[col] as string | null
      if (old && old !== dbPayload[col]) await deleteB2ByUrl(old)
    }
  }

  let id = payload.id
  let dbError: { code?: string; message: string } | null = null

  if (id) {
    const res = await supabaseAdmin.from('projects').update(dbPayload).eq('id', id)
    dbError = res.error
  } else {
    const res = await supabaseAdmin.from('projects').insert(dbPayload).select('id').single()
    dbError = res.error
    id = res.data?.id as string | undefined
  }

  if (dbError || !id) {
    console.error('[projekty] saveProject:', dbError?.message)
    if (dbError?.code === '23505') {
      return { success: false, error: 'Špecifický symbol alebo VS zo starého webu už používa iná výzva.' }
    }
    return { success: false, error: 'Nepodarilo sa uložiť výzvu.' }
  }

  revalidateProject(id, slug)
  if (existing && existing.slug !== slug) revalidatePath(`/vyzvy/${existing.slug}`)
  return { success: true, id, slug }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requirePermission(PERMISSION)

  const [donations, donorProjects, payments, subs] = await Promise.all([
    supabaseAdmin.from('donations').select('*', { count: 'exact', head: true }).eq('project_id', id),
    supabaseAdmin.from('donor_projects').select('*', { count: 'exact', head: true }).eq('project_id', id),
    supabaseAdmin.from('online_payments').select('*', { count: 'exact', head: true }).eq('project_id', id),
    supabaseAdmin.from('online_subscriptions').select('*', { count: 'exact', head: true }).eq('project_id', id),
  ])

  const blockers: string[] = []
  if (donations.count) blockers.push(`${donations.count} darov`)
  if (donorProjects.count) blockers.push(`${donorProjects.count} darcov`)
  if (payments.count) blockers.push(`${payments.count} online platieb`)
  if (subs.count) blockers.push(`${subs.count} predplatných`)
  if (blockers.length) {
    return {
      success: false,
      error: `Výzvu nie je možné zmazať, je naviazaná na ${blockers.join(', ')}. Nastavte ju radšej ako Ukončenú a skryte z webu.`,
    }
  }

  const [{ data: project }, { data: media }] = await Promise.all([
    supabaseAdmin.from('projects').select('slug, image_url, guarantor_photo_url').eq('id', id).maybeSingle(),
    supabaseAdmin.from('project_media').select('kind, url, thumbnail_url').eq('project_id', id),
  ])

  const files: (string | null)[] = [project?.image_url ?? null, project?.guarantor_photo_url ?? null]
  for (const m of (media ?? []) as { kind: MediaKind; url: string; thumbnail_url: string | null }[]) {
    if (m.kind !== 'video') files.push(m.url)
    files.push(m.thumbnail_url)
  }
  await Promise.all(files.map((f) => deleteB2ByUrl(f)))

  const { error } = await supabaseAdmin.from('projects').delete().eq('id', id)
  if (error) {
    console.error('[projekty] deleteProject:', error.message)
    return { success: false, error: 'Nepodarilo sa zmazať výzvu.' }
  }

  revalidateProject(id, project?.slug)
  return { success: true }
}

// ------------------------------------------------------------
// Súbory (B2)
// ------------------------------------------------------------

/**
 * Nahrá súbor výzvy na Backblaze B2. FormData: file, projectId?, kind
 * (hero | guarantor | gallery | document | content).
 */
export async function uploadProjectFile(
  formData: FormData
): Promise<{ url: string; name: string; size: number; type: string } | { error: string }> {
  await requirePermission(PERMISSION)
  try {
    const file = formData.get('file')
    const projectId = (formData.get('projectId') as string | null) || null
    const kindRaw = (formData.get('kind') as string | null) || 'gallery'
    const kind: UploadKind = (UPLOAD_KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as UploadKind) : 'gallery'

    if (!(file instanceof File)) return { error: 'Žiadny súbor nebol odovzdaný.' }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { error: `Súbor je príliš veľký (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximálna veľkosť je 4 MB.` }
    }

    const folder = projectId ? `projects/${projectId}/${kind}` : `projects/temp/${kind}`
    const result = await uploadImage(file, folder)
    if (!result) return { error: 'Nahrávanie na Backblaze B2 zlyhalo.' }

    return { url: result.url, name: file.name, size: file.size, type: file.type }
  } catch (err) {
    console.error('[projekty] uploadProjectFile:', err)
    return { error: err instanceof Error ? err.message : 'Chyba pri nahrávaní súboru.' }
  }
}

// ------------------------------------------------------------
// Galéria, videá, dokumenty
// ------------------------------------------------------------

export async function addProjectMedia(input: {
  project_id: string
  kind: MediaKind
  url: string
  title?: string | null
  phase?: MediaPhase | null
  mime_type?: string | null
  file_size?: number | null
  thumbnail_url?: string | null
}): Promise<{ success: true; media: ProjectMedia } | { success: false; error: string }> {
  await requirePermission(PERMISSION)

  const url = input.url?.trim()
  if (!url) return { success: false, error: 'Chýba adresa súboru alebo videa.' }

  const { data: last } = await supabaseAdmin
    .from('project_media')
    .select('sort_order')
    .eq('project_id', input.project_id)
    .eq('kind', input.kind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabaseAdmin
    .from('project_media')
    .insert({
      project_id: input.project_id,
      kind: input.kind,
      url,
      title: text(input.title),
      phase: input.kind === 'image' ? input.phase ?? null : null,
      mime_type: input.mime_type ?? null,
      file_size: input.file_size ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      sort_order: (num(last?.sort_order, -1)) + 1,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[projekty] addProjectMedia:', error?.message)
    return { success: false, error: 'Nepodarilo sa pridať položku.' }
  }

  revalidateProject(input.project_id)
  return { success: true, media: mapMedia(data as Raw) }
}

export async function updateProjectMedia(
  id: string,
  patch: { title?: string | null; phase?: MediaPhase | null; visible?: boolean }
): Promise<ActionResult> {
  await requirePermission(PERMISSION)

  const update: Raw = {}
  if ('title' in patch) update.title = text(patch.title)
  if ('phase' in patch) update.phase = patch.phase ?? null
  if ('visible' in patch) update.visible = !!patch.visible

  const { data, error } = await supabaseAdmin.from('project_media').update(update).eq('id', id).select('project_id').single()
  if (error) {
    console.error('[projekty] updateProjectMedia:', error.message)
    return { success: false, error: 'Nepodarilo sa uložiť zmenu.' }
  }
  revalidateProject(data?.project_id as string | undefined)
  return { success: true }
}

export async function deleteProjectMedia(id: string): Promise<ActionResult> {
  await requirePermission(PERMISSION)

  const { data: row } = await supabaseAdmin
    .from('project_media')
    .select('project_id, kind, url, thumbnail_url')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { success: false, error: 'Položka neexistuje.' }

  if (row.kind !== 'video') await deleteB2ByUrl(row.url as string)
  await deleteB2ByUrl(row.thumbnail_url as string | null)

  const { error } = await supabaseAdmin.from('project_media').delete().eq('id', id)
  if (error) {
    console.error('[projekty] deleteProjectMedia:', error.message)
    return { success: false, error: 'Nepodarilo sa zmazať položku.' }
  }
  revalidateProject(row.project_id as string)
  return { success: true }
}

/** Uloží nové poradie položiek (ids v požadovanom poradí, v rámci jedného druhu). */
export async function reorderProjectMedia(projectId: string, orderedIds: string[]): Promise<ActionResult> {
  await requirePermission(PERMISSION)

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabaseAdmin.from('project_media').update({ sort_order: index }).eq('id', id).eq('project_id', projectId)
    )
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    console.error('[projekty] reorderProjectMedia:', failed.error.message)
    return { success: false, error: 'Nepodarilo sa uložiť poradie.' }
  }
  revalidateProject(projectId)
  return { success: true }
}

// ------------------------------------------------------------
// Rozpočet
// ------------------------------------------------------------

export async function saveBudgetItems(
  projectId: string,
  items: BudgetItemInput[]
): Promise<{ success: true; items: ProjectBudgetItem[] } | { success: false; error: string }> {
  await requirePermission(PERMISSION)

  const cleaned = items
    .map((it) => ({ ...it, title: it.title?.trim() ?? '' }))
    .filter((it) => it.title.length > 0)

  const { data: existingRows } = await supabaseAdmin.from('project_budget_items').select('id').eq('project_id', projectId)
  const keep = new Set(cleaned.map((it) => it.id).filter((x): x is string => !!x))
  const toDelete = ((existingRows ?? []) as { id: string }[]).map((r) => r.id).filter((id) => !keep.has(id))

  if (toDelete.length) {
    const { error } = await supabaseAdmin.from('project_budget_items').delete().in('id', toDelete)
    if (error) return { success: false, error: 'Nepodarilo sa odstrániť položky rozpočtu.' }
  }

  for (let i = 0; i < cleaned.length; i++) {
    const it = cleaned[i]
    const row = {
      project_id: projectId,
      title: it.title,
      description: text(it.description),
      planned_amount: Math.max(0, num(it.planned_amount)),
      actual_amount: numOrNull(it.actual_amount),
      status: it.status,
      sort_order: i,
    }
    const res = it.id
      ? await supabaseAdmin.from('project_budget_items').update(row).eq('id', it.id).eq('project_id', projectId)
      : await supabaseAdmin.from('project_budget_items').insert(row)
    if (res.error) {
      console.error('[projekty] saveBudgetItems:', res.error.message)
      return { success: false, error: `Nepodarilo sa uložiť položku „${it.title}“.` }
    }
  }

  const { data } = await supabaseAdmin.from('project_budget_items').select('*').eq('project_id', projectId).order('sort_order')
  revalidateProject(projectId)
  return { success: true, items: ((data ?? []) as Raw[]).map(mapBudget) }
}

// ------------------------------------------------------------
// Harmonogram
// ------------------------------------------------------------

export async function saveMilestones(
  projectId: string,
  items: MilestoneInput[]
): Promise<{ success: true; items: ProjectMilestone[] } | { success: false; error: string }> {
  await requirePermission(PERMISSION)

  const cleaned = items
    .map((it) => ({ ...it, title: it.title?.trim() ?? '' }))
    .filter((it) => it.title.length > 0)

  const { data: existingRows } = await supabaseAdmin.from('project_milestones').select('id').eq('project_id', projectId)
  const keep = new Set(cleaned.map((it) => it.id).filter((x): x is string => !!x))
  const toDelete = ((existingRows ?? []) as { id: string }[]).map((r) => r.id).filter((id) => !keep.has(id))

  if (toDelete.length) {
    const { error } = await supabaseAdmin.from('project_milestones').delete().in('id', toDelete)
    if (error) return { success: false, error: 'Nepodarilo sa odstrániť míľniky.' }
  }

  for (let i = 0; i < cleaned.length; i++) {
    const it = cleaned[i]
    const row = {
      project_id: projectId,
      title: it.title,
      description: text(it.description),
      due_date: it.due_date || null,
      completed_at: it.completed_at || null,
      sort_order: i,
    }
    const res = it.id
      ? await supabaseAdmin.from('project_milestones').update(row).eq('id', it.id).eq('project_id', projectId)
      : await supabaseAdmin.from('project_milestones').insert(row)
    if (res.error) {
      console.error('[projekty] saveMilestones:', res.error.message)
      return { success: false, error: `Nepodarilo sa uložiť míľnik „${it.title}“.` }
    }
  }

  const { data } = await supabaseAdmin.from('project_milestones').select('*').eq('project_id', projectId).order('sort_order')
  revalidateProject(projectId)
  return { success: true, items: ((data ?? []) as Raw[]).map(mapMilestone) }
}
