'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/storage'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DownloadFile {
  label: string
  url: string
}

export interface DownloadPayload {
  id?: string
  category: 'document' | 'annual_report' | 'logo'
  title: string
  description?: string | null
  year?: number | null
  image_url?: string | null
  files: DownloadFile[]
  sort_order?: number
  visible?: boolean
}

/**
 * Pomocník pre získanie kľúča (key) súboru z verejnej B2 URL adresy.
 * Pre lokálne cesty (/downloads/...) vráti null – tie sa nemažú.
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
 * Vymaže z B2 súbory, ktoré už položka nepoužíva.
 */
async function cleanupRemovedFiles(
  oldItem: { image_url?: string | null; files?: DownloadFile[] } | null,
  newImageUrl: string | null,
  newFiles: DownloadFile[]
) {
  if (!oldItem) return

  if (oldItem.image_url && oldItem.image_url !== newImageUrl) {
    const key = getB2KeyFromUrl(oldItem.image_url)
    if (key) await deleteImage(key)
  }

  const newUrls = new Set(newFiles.map((f) => f.url))
  for (const f of oldItem.files || []) {
    if (!newUrls.has(f.url)) {
      const key = getB2KeyFromUrl(f.url)
      if (key) await deleteImage(key)
    }
  }
}

/**
 * Zoznam všetkých položiek Na stiahnutie pre admin prostredie.
 */
export async function getDownloads() {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('downloads')
    .select('*')
    .order('category', { ascending: true })
    .order('year', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Chyba pri načítaní položiek na stiahnutie:', error)
    return []
  }

  return data || []
}

/**
 * Vytvorí alebo aktualizuje položku Na stiahnutie.
 */
export async function upsertDownload(payload: DownloadPayload) {
  await requireAdmin()

  const dbPayload = {
    category: payload.category,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    year: payload.year ?? null,
    image_url: payload.image_url || null,
    files: payload.files || [],
    sort_order: payload.sort_order ?? 0,
    visible: payload.visible ?? true,
    updated_at: new Date().toISOString(),
  }

  let error
  if (payload.id) {
    const { data: existing } = await supabaseAdmin
      .from('downloads')
      .select('image_url, files')
      .eq('id', payload.id)
      .single()

    await cleanupRemovedFiles(existing, dbPayload.image_url, dbPayload.files)

    const res = await supabaseAdmin
      .from('downloads')
      .update(dbPayload)
      .eq('id', payload.id)
    error = res.error
  } else {
    const res = await supabaseAdmin.from('downloads').insert(dbPayload)
    error = res.error
  }

  if (error) {
    console.error('Chyba pri ukladaní položky na stiahnutie:', error)
    return { success: false, error: 'Nepodarilo sa uložiť položku.' }
  }

  revalidatePath('/admin/na-stiahnutie')
  revalidatePath('/na-stiahnutie')
  return { success: true }
}

/**
 * Vymaže položku Na stiahnutie vrátane súborov na B2.
 */
export async function deleteDownload(id: string) {
  await requireAdmin()

  const { data: existing } = await supabaseAdmin
    .from('downloads')
    .select('image_url, files')
    .eq('id', id)
    .single()

  await cleanupRemovedFiles(existing, null, [])

  const { error } = await supabaseAdmin.from('downloads').delete().eq('id', id)

  if (error) {
    console.error('Chyba pri mazaní položky na stiahnutie:', error)
    return { success: false, error: 'Nepodarilo sa zmazať položku.' }
  }

  revalidatePath('/admin/na-stiahnutie')
  revalidatePath('/na-stiahnutie')
  return { success: true }
}

/**
 * Server Action na nahrávanie súboru (PDF, DOCX, obrázok…) na Backblaze B2.
 */
export async function uploadDownloadFile(formData: FormData) {
  await requireAdmin()
  try {
    const file = formData.get('file') as File
    const kind = (formData.get('kind') as string) || 'files'

    if (!file) {
      return { error: 'Žiadny súbor nebol odovzdaný' }
    }

    const result = await uploadImage(file, `downloads/${kind}`)

    if (!result) {
      return { error: 'Nahrávanie na Backblaze B2 zlyhalo' }
    }

    // Label podľa prípony súboru (PDF, DOCX, PNG…)
    const ext = file.name.split('.').pop()?.toUpperCase() || 'SÚBOR'
    return { url: result.url, label: ext }
  } catch (err: any) {
    console.error('Chyba pri nahrávaní súboru:', err)
    return { error: err.message || 'Chyba pri nahrávaní súboru' }
  }
}
