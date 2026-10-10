'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/html/sanitize'
import { HELP_BASE, helpDb, type HelpZone } from '@/lib/help'
import { parseVideoUrl, videoWatchUrl } from '@/lib/parishes/video'

export interface HelpArticleInput {
  zone: HelpZone
  slug: string
  title: string
  summary: string
  content: string
  video_url: string
  sort_order: number
  published: boolean
}

type Result = { ok: true; id: string } | { ok: false; error: string }

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** „sprava“ je adresa správy návodov (/admin/pomoc/sprava) */
const RESERVED = new Set(['sprava'])

/** Uloží nový alebo upravený návod (oprávnenie manage_help). */
export async function saveHelpArticle(id: string | null, input: HelpArticleInput): Promise<Result> {
  const { user } = await requirePermission('manage_help')
  const slug = input.slug.trim().toLowerCase()
  const title = input.title.trim()
  if (input.zone !== 'parish' && input.zone !== 'admin') return { ok: false, error: 'Neznáma zóna.' }
  if (!title) return { ok: false, error: 'Zadajte názov návodu.' }
  if (!SLUG_RE.test(slug) || RESERVED.has(slug)) return { ok: false, error: 'Adresa (slug) môže obsahovať len malé písmená bez diakritiky, číslice a pomlčky.' }

  const videoRaw = input.video_url.trim()
  const video = videoRaw ? parseVideoUrl(videoRaw) : null
  if (videoRaw && !video) return { ok: false, error: 'Video musí byť odkaz na YouTube alebo Vimeo.' }

  const row = {
    zone: input.zone,
    slug,
    title,
    summary: input.summary.trim() || null,
    content: sanitizeRichHtml(input.content),
    video_url: video ? videoWatchUrl(video) : null,
    sort_order: Number.isFinite(input.sort_order) ? Math.round(input.sort_order) : 0,
    published: input.published,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }
  const db = helpDb()
  const res = id ? await db.from('help_articles').update(row).eq('id', id).select('id').single() : await db.from('help_articles').insert(row).select('id').single()
  if (res.error) return { ok: false, error: res.error.code === '23505' ? 'Návod s touto adresou v tejto zóne už existuje.' : 'Návod sa nepodarilo uložiť.' }
  revalidatePath(HELP_BASE[input.zone], 'layout')
  return { ok: true, id: res.data.id as string }
}

export async function deleteHelpArticle(id: string): Promise<{ ok: boolean; error?: string }> {
  await requirePermission('manage_help')
  const { error } = await helpDb().from('help_articles').delete().eq('id', id)
  if (error) return { ok: false, error: 'Návod sa nepodarilo zmazať.' }
  revalidatePath('/admin/pomoc', 'layout')
  revalidatePath(HELP_BASE.parish, 'layout')
  return { ok: true }
}
