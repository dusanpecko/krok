import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { mapBudget, mapMedia, mapMilestone, mapProject, mapStats, type Raw } from './mappers'
import {
  EMPTY_STATS,
  type ProjectBudgetItem,
  type ProjectMedia,
  type ProjectMilestone,
  type ProjectRow,
  type ProjectStats,
} from './types'

/**
 * Verejné čítanie výziev na podporu. Číta cez service role a filtruje v dotaze
 * (rovnaký vzor ako ostatné verejné stránky), takže nezávisí od anon RLS.
 */

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PublicProject extends ProjectRow {
  stats: ProjectStats
}

export interface PublicProjectPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  published_at: string | null
}

export interface PublicProjectDetail extends PublicProject {
  media: ProjectMedia[]
  budget: ProjectBudgetItem[]
  milestones: ProjectMilestone[]
  posts: PublicProjectPost[]
  parish_name: string | null
}

async function attachStats(rows: Raw[]): Promise<PublicProject[]> {
  if (!rows.length) return []
  const ids = rows.map((r) => String(r.id))
  const { data: stats } = await supabaseAdmin.from('v_project_stats').select('*').in('project_id', ids)
  const byId = new Map<string, ProjectStats>()
  for (const s of (stats ?? []) as Raw[]) byId.set(String(s.project_id), mapStats(s))
  return rows.map((r) => {
    const p = mapProject(r)
    return { ...p, stats: byId.get(p.id) ?? EMPTY_STATS }
  })
}

/** Všetky zverejnené výzvy (aktívne aj ukončené), bez návrhov. */
export async function getPublicProjects(): Promise<PublicProject[]> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('visible_on_web', true)
    .neq('status', 'draft')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.error('[vyzvy] getPublicProjects:', error.message)
    return []
  }
  return attachStats((data ?? []) as Raw[])
}

/** Výzvy zvýraznené na domovskej stránke (featured, aktívne). */
export async function getFeaturedPublicProjects(limit = 3): Promise<PublicProject[]> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('visible_on_web', true)
    .eq('status', 'active')
    .eq('featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit)
  if (error) {
    console.error('[vyzvy] getFeaturedPublicProjects:', error.message)
    return []
  }
  return attachStats((data ?? []) as Raw[])
}

/** Detail zverejnenej výzvy podľa slugu vrátane médií, rozpočtu, harmonogramu a správ. */
export async function getPublicProjectBySlug(slug: string): Promise<PublicProjectDetail | null> {
  const { data: row, error } = await supabaseAdmin
    .from('projects')
    .select('*, parishes(name)')
    .eq('slug', slug)
    .eq('visible_on_web', true)
    .neq('status', 'draft')
    .maybeSingle()
  if (error || !row) return null

  const raw = row as Raw
  const parishRel = raw.parishes as { name?: string } | { name?: string }[] | null
  const parish = Array.isArray(parishRel) ? parishRel[0] : parishRel

  const [project] = await attachStats([raw])
  const id = project.id

  const [mediaRes, budgetRes, milestonesRes, postsRes] = await Promise.all([
    supabaseAdmin.from('project_media').select('*').eq('project_id', id).eq('visible', true).order('sort_order'),
    supabaseAdmin.from('project_budget_items').select('*').eq('project_id', id).order('sort_order'),
    supabaseAdmin.from('project_milestones').select('*').eq('project_id', id).order('sort_order'),
    supabaseAdmin
      .from('posts')
      .select('id, title, slug, excerpt, featured_image, published_at')
      .eq('project_id', id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(12),
  ])

  return {
    ...project,
    parish_name: parish?.name ?? null,
    media: ((mediaRes.data ?? []) as Raw[]).map(mapMedia),
    budget: ((budgetRes.data ?? []) as Raw[]).map(mapBudget),
    milestones: ((milestonesRes.data ?? []) as Raw[]).map(mapMilestone),
    posts: (postsRes.data ?? []) as PublicProjectPost[],
  }
}
