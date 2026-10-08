'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { dioceseDb } from '@/lib/diocese/public'
import { listIssues, saveIssue, storeCover, syncFromZachej, type MagazineInput, type MagazineRow } from '@/lib/diocese/magazine'

/** Web diecézy dcza.sk – správa kúriou (§ 20, D3). Zatiaľ časopis. */

const PERM = 'manage_diocese_web'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }
const fail = (err: unknown) => ({ success: false as const, error: err instanceof Error ? err.message : 'Neznáma chyba' })

function revalidateMagazine() {
  revalidatePath('/admin/web-dieceza/casopis')
  revalidatePath('/dcza', 'layout')
}

export async function adminListMagazine(): Promise<MagazineRow[]> {
  await requirePermission(PERM)
  return listIssues(dioceseDb())
}

export async function adminSaveMagazine(id: string | null, input: MagazineInput): Promise<Result<{ id: string }>> {
  try {
    await requirePermission(PERM)
    const res = await saveIssue(dioceseDb(), id, input)
    if (res.success) revalidateMagazine()
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminDeleteMagazine(id: string): Promise<Result> {
  try {
    await requirePermission(PERM)
    const { error } = await dioceseDb().from('diocese_magazine_issues').delete().eq('id', id)
    if (error) return { success: false, error: 'Zmazanie zlyhalo.' }
    revalidateMagazine()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

/** Nahratie obálky (JPG/PNG/WebP) → WebP na B2. */
export async function adminUploadMagazineCover(formData: FormData): Promise<Result<{ url: string }>> {
  try {
    await requirePermission(PERM)
    const file = formData.get('file')
    if (!(file instanceof File) || !file.type.startsWith('image/')) return { success: false, error: 'Vyberte obrázok obálky.' }
    if (file.size > 15 * 1024 * 1024) return { success: false, error: 'Obrázok je väčší ako 15 MB.' }
    const url = await storeCover(Buffer.from(await file.arrayBuffer()))
    return url ? { success: true, url } : { success: false, error: 'Nahratie zlyhalo.' }
  } catch (err) {
    return fail(err)
  }
}

export async function adminSyncMagazine(): Promise<Result<{ added: string[]; updated: string[]; errors: string[] }>> {
  try {
    await requirePermission(PERM)
    const res = await syncFromZachej(dioceseDb())
    revalidateMagazine()
    return { success: true, ...res }
  } catch (err) {
    return fail(err)
  }
}
