'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'

export async function upsertParish(data: {
  id?: string
  name: string
  deanery_id?: string | null
  city?: string | null
  postal_code?: string | null
}) {
  await requirePermission('manage_config')
  const supabase = await createClient()

  const { error } = await supabase
    .from('parishes')
    .upsert({
      ...(data.id ? { id: data.id } : {}),
      name: data.name,
      deanery_id: data.deanery_id || null,
      city: data.city || null,
      postal_code: data.postal_code || null,
    })

  if (error) {
    console.error('Parish upsert error:', error)
    return { success: false, error: 'Nepodarilo sa uložiť farnosť.' }
  }

  revalidatePath('/admin/nastavenia/farnosti')
  return { success: true }
}

export async function deleteParish(id: string) {
  await requirePermission('manage_config')
  const supabase = await createClient()

  // Safety check: is it used by any donor?
  const { count } = await supabase
    .from('donors')
    .select('*', { count: 'exact', head: true })
    .eq('parish_id', id)

  if (count && count > 0) {
    return {
      success: false,
      error: `Farnosť nie je možné zmazať – je priradená k ${count} darcom.`
    }
  }

  const { error } = await supabase
    .from('parishes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Parish delete error:', error)
    return { success: false, error: 'Nepodarilo sa zmazať farnosť.' }
  }

  revalidatePath('/admin/nastavenia/farnosti')
  return { success: true }
}
