import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Výber farnosti a podporovaného projektu darcom (registrácia, onboarding, profil).
 * Serverový modul – overuje hodnoty prichádzajúce od klienta (metadata registrácie, formuláre).
 */

/**
 * Riadky v `parishes`, ktoré nie sú farnosti, ale projekty zvolené namiesto farnosti
 * (návrh farností § 2, O19). Vo výbere farnosti sa neponúkajú; v F1 sa zmažú.
 */
export const PSEUDO_PARISH_NAMES = ['Lectio divina', 'Dve percenta', 'Charita', 'Rodinkovo']

export { NO_PARISH } from './constants'

export interface ChoiceOption {
  id: string
  name: string
}

const sortKey = (name: string) => name.replace(/^Farnosť\s+/i, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Farnosti (bez pseudo-farností, zoradené podľa mena bez predpony „Farnosť“) a verejné projekty. */
export async function loadDonorChoiceOptions(admin: SupabaseClient): Promise<{ parishes: ChoiceOption[]; projects: ChoiceOption[] }> {
  const [{ data: parishes }, { data: projects }] = await Promise.all([
    admin.from('parishes').select('id, name').eq('is_active', true),
    admin.from('projects').select('id, name').eq('visible_on_web', true).order('name'),
  ])
  return {
    parishes: ((parishes ?? []) as ChoiceOption[])
      .filter((p) => !PSEUDO_PARISH_NAMES.includes(p.name))
      .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'sk')),
    projects: (projects ?? []) as ChoiceOption[],
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Overí farnosť od klienta: existuje a nie je pseudo-farnosť. `none` / prázdne → null. */
export async function validateParishId(admin: SupabaseClient, value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || !UUID_RE.test(value)) return null
  const { data } = await admin.from('parishes').select('id, name').eq('id', value).eq('is_active', true).maybeSingle()
  if (!data || PSEUDO_PARISH_NAMES.includes(data.name as string)) return null
  return data.id as string
}

/** Slug z odkazu „Podporujem fond“ na stránke farnosti → id farnosti na predvyplnenie (O31). */
export async function resolveParishSlug(admin: SupabaseClient, slug: unknown): Promise<string | null> {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,120}$/.test(slug)) return null
  const { data } = await admin.from('parishes').select('id, name').eq('slug', slug).eq('is_active', true).maybeSingle()
  if (!data || PSEUDO_PARISH_NAMES.includes(data.name as string)) return null
  return data.id as string
}

/** Overí projekt od klienta: existuje a je zverejnený. */
export async function validateProjectId(admin: SupabaseClient, value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || !UUID_RE.test(value)) return null
  const { data } = await admin.from('projects').select('id').eq('id', value).eq('visible_on_web', true).maybeSingle()
  return (data?.id as string | undefined) ?? null
}

/** Pridá darcovi podporovaný projekt (ak ho ešte nemá). */
export async function addDonorProject(admin: SupabaseClient, donorId: string, projectId: string | null) {
  if (!projectId) return
  const { data: existing } = await admin
    .from('donor_projects')
    .select('project_id')
    .eq('donor_id', donorId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (!existing) await admin.from('donor_projects').insert({ donor_id: donorId, project_id: projectId })
}
