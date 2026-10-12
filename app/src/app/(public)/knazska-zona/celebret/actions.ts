'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { celebretDb, processPortrait } from '@/lib/clergy/celebret'

/** Kňaz pošle fotku na celebret – schváli ju kúria (Celebrety → Fotky od kňazov). */
export async function submitCelebretPhoto(form: FormData): Promise<{ success: true } | { success: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Prihláste sa.' }
  const db = celebretDb()
  const { data: clergy } = await db.from('clergy').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!clergy) return { success: false, error: 'Váš účet nie je prepojený s registrom kňazov.' }
  const file = form.get('file')
  if (!(file instanceof File) || !file.size) return { success: false, error: 'Vyberte fotku.' }
  const url = await processPortrait(file)
  if (!url) return { success: false, error: 'Fotku sa nepodarilo spracovať (JPG, PNG alebo WebP).' }
  // staršia čakajúca fotka sa nahradí novou
  await db.from('clergy_photo_requests').delete().eq('clergy_id', clergy.id).eq('status', 'pending')
  const { error } = await db.from('clergy_photo_requests').insert({ clergy_id: clergy.id, photo_url: url })
  if (error) return { success: false, error: 'Fotku sa nepodarilo uložiť.' }
  revalidatePath('/knazska-zona/celebret')
  return { success: true }
}
