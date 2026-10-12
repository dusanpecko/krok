import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { celebretCookieName, getCelebretByToken, isUnlocked, latestTokenForSlug } from '@/lib/clergy/celebret'
import CelebretUnlockForm from '@/components/celebret/CelebretUnlockForm'
import { siteBaseUrl } from '@/lib/site-server'
import CelebretDocument from '@/components/celebret/CelebretDocument'

export const dynamic = 'force-dynamic'

// overovacia stránka sa nesmie dať nájsť vyhľadávačom (§ 16.9)
export const metadata: Metadata = { title: 'Celebret – Dioecesis Žilinensis', robots: { index: false, follow: false } }

/**
 * Overenie celebretu (QR) – celebret.dcza.sk/<kód> (middleware prepíše na /celebret/<kód>).
 * Staré adresy podľa mena (celebret.dcza.sk/<meno>, …/<meno>/qr) presmerujú na najnovší celebret.
 */
export default async function CelebretPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase()
  const celebret = await getCelebretByToken(code)
  if (!celebret) {
    const token = await latestTokenForSlug(code)
    if (!token) notFound()
    const host = (await headers()).get('host') ?? ''
    redirect(host.startsWith('celebret.') ? `/${token}` : `/celebret/${token}`)
  }
  const profileUrl = celebret.profile_slug ? `${siteBaseUrl('dcza')}/schematizmus/knazi/${celebret.profile_slug}` : null
  // údaje až po hesle z karty; stav platnosti je verejný (061)
  const unlocked = isUnlocked(celebret.token, celebret.access_code, (await cookies()).get(celebretCookieName(celebret.token))?.value)
  return (
    <main className="min-h-screen bg-paper-warm px-4 py-8 sm:py-12">
      <CelebretDocument c={celebret} profileUrl={profileUrl} locked={!unlocked} unlockForm={<CelebretUnlockForm token={celebret.token} />} />
    </main>
  )
}
