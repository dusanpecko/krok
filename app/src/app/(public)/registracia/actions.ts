'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Privileged admin client to bypass INSERT RLS restriction for anonymous visitor
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Feches options lists for parishes and active projects
 */
export async function getRegistrationFormOptions() {
  // Use privileged admin client to bypass RLS restrictions for public anonymous visitor
  // since parishes and projects tables might restrict read access for anonymous clients

  // 1. Fetch all parishes ordered by name
  const { data: parishes, error: parishesError } = await supabaseAdmin
    .from('parishes')
    .select('id, name')
    .order('name')

  if (parishesError) {
    console.error('Error fetching parishes:', {
      message: parishesError.message,
      code: parishesError.code,
      details: parishesError.details,
      hint: parishesError.hint
    })
  }

  // 2. Fetch active projects ordered by name
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .eq('visible_on_web', true)
    .order('name')

  if (projectsError) {
    console.error('Error fetching projects:', {
      message: projectsError.message,
      code: projectsError.code,
      details: projectsError.details,
      hint: projectsError.hint
    })
  }

  return {
    parishes: parishes || [],
    projects: projects || [],
  }
}
