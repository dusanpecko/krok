'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function upsertProject(data: {
  id?: string
  name: string
  description?: string | null
  category?: string
  status?: string
  target_amount?: number | null
  start_date?: string | null
  end_date?: string | null
  specific_symbol?: string | null
  visible_on_web?: boolean
}) {
  await requirePermission('manage_config')
  const supabase = await createClient()

  const slug = generateSlug(data.name)

  const { error } = await supabase
    .from('projects')
    .upsert({
      ...(data.id ? { id: data.id } : {}),
      name: data.name,
      slug: data.id ? undefined : slug, // only set slug on create
      description: data.description || null,
      category: data.category || 'other',
      status: data.status || 'active',
      target_amount: data.target_amount || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      specific_symbol: data.specific_symbol || null,
      visible_on_web: data.visible_on_web || false,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Project upsert error:', error)
    return { success: false, error: 'Nepodarilo sa uložiť projekt.' }
  }

  revalidatePath('/admin/projekty')
  revalidatePath('/admin/darcovia')
  return { success: true }
}

export async function deleteProject(id: string) {
  await requirePermission('manage_config')
  const supabase = await createClient()

  // Safety check: is it linked to any donors?
  const { count } = await supabase
    .from('donor_projects')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  if (count && count > 0) {
    return {
      success: false,
      error: `Projekt nie je možné zmazať – je priradený k ${count} darcom.`
    }
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Project delete error:', error)
    return { success: false, error: 'Nepodarilo sa zmazať projekt.' }
  }

  revalidatePath('/admin/projekty')
  return { success: true }
}
