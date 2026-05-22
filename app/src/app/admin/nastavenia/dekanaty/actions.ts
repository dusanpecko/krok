'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertDeanery(data: { id?: string; name: string }) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('deaneries')
    .upsert({
      ...(data.id ? { id: data.id } : {}),
      name: data.name
    })

  if (error) {
    console.error('Deanery upsert error:', error)
    return { success: false, error: 'Nepodarilo sa uložiť dekanát.' }
  }

  revalidatePath('/admin/nastavenia/dekanaty')
  return { success: true }
}

export async function deleteDeanery(id: string) {
  const supabase = await createClient()

  // Safety check: is it used by any parish?
  const { count, error: countError } = await supabase
    .from('parishes')
    .select('*', { count: 'exact', head: true })
    .eq('deanery_id', id)

  if (count && count > 0) {
    return { success: false, error: `Dekanát nie je možné zmazať, pretože k nemu patrí ${count} farností.` }
  }

  const { error } = await supabase
    .from('deaneries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Deanery delete error:', error)
    return { success: false, error: 'Nepodarilo sa zmazať dekanát.' }
  }

  revalidatePath('/admin/nastavenia/dekanaty')
  return { success: true }
}
