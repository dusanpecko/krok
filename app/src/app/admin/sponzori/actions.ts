'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { uploadImage, deleteImage, getB2KeyFromUrl } from '@/lib/storage'
import { sortSponsors, type Sponsor, type SponsorPayload } from '@/lib/sponsors/types'

/** Admin akcie pre sponzorov / partnerov (pás „Podporili nás“). */

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const URL_RE = /^https?:\/\/[^\s]+$/i

type Raw = Record<string, unknown>

function text(v?: string | null): string | null {
  const t = v?.trim()
  return t ? t : null
}

function mapSponsor(r: Raw): Sponsor {
  return {
    ...(r as unknown as Sponsor),
    amount: r.amount === null || r.amount === undefined ? null : Number(r.amount),
    sort_order: Number(r.sort_order ?? 0),
    amount_public: !!r.amount_public,
    is_active: r.is_active !== false,
  }
}

async function deleteB2ByUrl(url?: string | null) {
  const key = getB2KeyFromUrl(url)
  if (key) await deleteImage(key)
}

function revalidate() {
  revalidatePath('/admin/sponzori')
  revalidatePath('/')
}

export async function getSponsors(): Promise<Sponsor[]> {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.error('[sponzori] getSponsors:', error.message)
    return []
  }
  return sortSponsors(((data ?? []) as Raw[]).map(mapSponsor))
}

export async function upsertSponsor(payload: SponsorPayload): Promise<{ success: true; id: string } | { success: false; error: string }> {
  await requireAdmin()

  const name = payload.name?.trim()
  if (!name) return { success: false, error: 'Názov sponzora je povinný.' }

  const website = text(payload.website_url)
  if (website && !URL_RE.test(website)) return { success: false, error: 'Webová adresa musí začínať na http:// alebo https://.' }

  const amount = payload.amount === null || payload.amount === undefined ? null : Number(payload.amount)
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return { success: false, error: 'Suma musí byť nezáporné číslo.' }

  if (payload.publish_from && payload.publish_until && payload.publish_from > payload.publish_until) {
    return { success: false, error: 'Dátum „zverejniť do“ je skôr než „zverejniť od“.' }
  }

  const dbPayload = {
    name,
    description: text(payload.description),
    logo_url: text(payload.logo_url),
    logo_dark_url: text(payload.logo_dark_url),
    website_url: website,
    amount,
    currency: 'EUR',
    amount_public: !!payload.amount_public,
    publish_from: payload.publish_from || null,
    publish_until: payload.publish_until || null,
    is_active: payload.is_active !== false,
    sort_order: Math.round(Number(payload.sort_order) || 0),
    internal_note: text(payload.internal_note),
  }

  let id = payload.id
  if (id) {
    // zmazať nahradené logá z B2
    const { data: existing } = await supabaseAdmin.from('sponsors').select('logo_url, logo_dark_url').eq('id', id).maybeSingle()
    if (!existing) return { success: false, error: 'Sponzor neexistuje.' }
    for (const col of ['logo_url', 'logo_dark_url'] as const) {
      const old = existing[col] as string | null
      if (old && old !== dbPayload[col]) await deleteB2ByUrl(old)
    }
    const { error } = await supabaseAdmin.from('sponsors').update(dbPayload).eq('id', id)
    if (error) {
      console.error('[sponzori] update:', error.message)
      return { success: false, error: 'Nepodarilo sa uložiť sponzora.' }
    }
  } else {
    const { data, error } = await supabaseAdmin.from('sponsors').insert(dbPayload).select('id').single()
    if (error || !data) {
      console.error('[sponzori] insert:', error?.message)
      return { success: false, error: 'Nepodarilo sa vytvoriť sponzora.' }
    }
    id = data.id as string
  }

  revalidate()
  return { success: true, id }
}

export async function deleteSponsor(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const { data: existing } = await supabaseAdmin.from('sponsors').select('logo_url, logo_dark_url').eq('id', id).maybeSingle()
  await deleteB2ByUrl(existing?.logo_url as string | null)
  await deleteB2ByUrl(existing?.logo_dark_url as string | null)

  const { error } = await supabaseAdmin.from('sponsors').delete().eq('id', id)
  if (error) {
    console.error('[sponzori] delete:', error.message)
    return { success: false, error: 'Nepodarilo sa zmazať sponzora.' }
  }
  revalidate()
  return { success: true }
}

/**
 * Nahrá (už orezané) logo na B2. FormData: file, sponsorId?, variant (light | dark).
 */
export async function uploadSponsorLogo(formData: FormData): Promise<{ url: string } | { error: string }> {
  await requireAdmin()
  try {
    const file = formData.get('file')
    const sponsorId = (formData.get('sponsorId') as string | null) || null
    const variant = formData.get('variant') === 'dark' ? 'dark' : 'light'
    if (!(file instanceof File)) return { error: 'Žiadny súbor nebol odovzdaný.' }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { error: `Logo je príliš veľké (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum je 4 MB.` }
    }
    const folder = sponsorId ? `sponsors/${sponsorId}/${variant}` : `sponsors/temp/${variant}`
    const result = await uploadImage(file, folder)
    if (!result) return { error: 'Nahrávanie na Backblaze B2 zlyhalo.' }
    return { url: result.url }
  } catch (err) {
    console.error('[sponzori] uploadSponsorLogo:', err)
    return { error: err instanceof Error ? err.message : 'Chyba pri nahrávaní loga.' }
  }
}
