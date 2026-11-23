import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getZoneAccess } from '@/lib/clergy-zone/access'
import { presignDownload } from '@/lib/clergy-zone/storage'

/**
 * Súbor kňazskej zóny: overí prístup a presmeruje na krátkodobú podpísanú adresu (5 min).
 * Koncept vidí len kúria. ?stiahnut=1 → stiahnutie, inak otvorenie v prehliadači.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(request.url)
  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(new URL(`/prihlasenie?redirect=${encodeURIComponent(url.pathname)}`, url.origin))
  const access = await getZoneAccess(user)
  if (!access) return new NextResponse('Prístup len pre kňazov a diakonov Žilinskej diecézy.', { status: 403 })
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Súbor sa nenašiel.', { status: 404 })

  const { data: f } = await access.db.from('clergy_doc_files').select('storage_key, file_name, clergy_docs!inner(published, clergy_doc_categories!inner(is_visible))').eq('id', id).maybeSingle()
  const doc = f?.clergy_docs as unknown as { published: boolean; clergy_doc_categories: { is_visible: boolean } } | undefined
  if (!f || !doc || (!access.canManage && (!doc.published || !doc.clergy_doc_categories.is_visible))) return new NextResponse('Súbor sa nenašiel.', { status: 404 })

  const signed = await presignDownload(f.storage_key, f.file_name, url.searchParams.get('stiahnut') !== '1')
  const res = NextResponse.redirect(signed, 302)
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}
