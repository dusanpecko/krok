'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/storage'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SupportedProjectPayload {
  id?: string
  year: number
  name: string
  organizer?: string | null
  realized_from?: string | null
  realized_to?: string | null
  description?: string | null
  amount?: number | null
  support_type: 'grant' | 'non_grant'
  sort_order?: number
  visible?: boolean
  image_url?: string | null
  link_url?: string | null
}

/**
 * Pomocník pre získanie kľúča (key) súboru z verejnej B2 URL adresy.
 */
function getB2KeyFromUrl(url?: string | null): string | null {
  if (!url) return null
  const bucketName = process.env.B2_BUCKET_NAME || 'parochia-storage-v1'
  const parts = url.split(bucketName + '/')
  if (parts.length > 1) {
    return parts[1]
  }
  return null
}

/**
 * Zoznam všetkých podporených projektov pre admin prostredie.
 */
export async function getSupportedProjects() {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('supported_projects')
    .select('*')
    .order('year', { ascending: false })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Chyba pri načítaní podporených projektov:', error)
    return []
  }

  return data || []
}

/**
 * Vytvorí alebo aktualizuje podporený projekt.
 */
export async function upsertSupportedProject(payload: SupportedProjectPayload) {
  await requireAdmin()

  const dbPayload = {
    year: payload.year,
    name: payload.name.trim(),
    organizer: payload.organizer?.trim() || null,
    realized_from: payload.realized_from || null,
    realized_to: payload.realized_to || null,
    description: payload.description?.trim() || null,
    amount: payload.amount ?? null,
    support_type: payload.support_type,
    sort_order: payload.sort_order ?? 0,
    visible: payload.visible ?? true,
    image_url: payload.image_url || null,
    link_url: payload.link_url?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  let error
  if (payload.id) {
    // Ak sa obrázok zmenil alebo odstránil, vymažeme starý súbor z B2
    const { data: existing } = await supabaseAdmin
      .from('supported_projects')
      .select('image_url')
      .eq('id', payload.id)
      .single()

    if (existing?.image_url && existing.image_url !== dbPayload.image_url) {
      const oldKey = getB2KeyFromUrl(existing.image_url)
      if (oldKey) {
        await deleteImage(oldKey)
      }
    }

    const res = await supabaseAdmin
      .from('supported_projects')
      .update(dbPayload)
      .eq('id', payload.id)
    error = res.error
  } else {
    const res = await supabaseAdmin.from('supported_projects').insert(dbPayload)
    error = res.error
  }

  if (error) {
    console.error('Chyba pri ukladaní podporeného projektu:', error)
    return { success: false, error: 'Nepodarilo sa uložiť projekt.' }
  }

  revalidatePath('/admin/podporene-projekty')
  revalidatePath('/podporene-projekty')
  return { success: true }
}

/**
 * Vymaže podporený projekt.
 */
export async function deleteSupportedProject(id: string) {
  await requireAdmin()

  // Vymažeme priradený obrázok z B2
  const { data: existing } = await supabaseAdmin
    .from('supported_projects')
    .select('image_url')
    .eq('id', id)
    .single()

  const imgKey = getB2KeyFromUrl(existing?.image_url)
  if (imgKey) {
    await deleteImage(imgKey)
  }

  const { error } = await supabaseAdmin
    .from('supported_projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Chyba pri mazaní podporeného projektu:', error)
    return { success: false, error: 'Nepodarilo sa zmazať projekt.' }
  }

  revalidatePath('/admin/podporene-projekty')
  revalidatePath('/podporene-projekty')
  return { success: true }
}

/**
 * Server Action na nahrávanie ilustračného obrázka projektu na Backblaze B2.
 */
export async function uploadSupportedProjectImage(formData: FormData) {
  await requireAdmin()
  try {
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file) {
      return { error: 'Žiadny súbor nebol odovzdaný' }
    }

    const folder = projectId
      ? `supported-projects/${projectId}/images`
      : 'supported-projects/temp'
    const result = await uploadImage(file, folder)

    if (!result) {
      return { error: 'Nahrávanie na Backblaze B2 zlyhalo' }
    }

    return { url: result.url }
  } catch (err: any) {
    console.error('Chyba pri nahrávaní obrázka:', err)
    return { error: err.message || 'Chyba pri nahrávaní súboru' }
  }
}
