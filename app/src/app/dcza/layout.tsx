import type { Metadata } from 'next'
import { getPageTree } from '@/lib/diocese/public'
import { mainNav } from '@/lib/diocese/nav'
import { listCuriaLinks } from '@/lib/diocese/schematizmus'
import DczaHeader from '@/components/dcza/DczaHeader'
import DczaFooter from '@/components/dcza/DczaFooter'
import ScrollProgress from '@/components/ScrollProgress'
import { getPublicPath, siteBaseUrl } from '@/lib/site-server'

/**
 * Web diecézy dcza.sk (krok_navrh_farnosti.md § 20). Na dcza.sk sem middleware prepisuje všetky nespoločné cesty.
 * Canonical = verejná cesta na dcza.sk (bez ?strana a pod.); stránka si ho môže prepísať (aktuality Kroku → mojkrok.sk).
 */
export async function generateMetadata(): Promise<Metadata> {
  const path = await getPublicPath()
  return {
    metadataBase: new URL(siteBaseUrl('dcza')),
    title: { default: 'Žilinská diecéza – Rímskokatolícka cirkev', template: '%s | Žilinská diecéza' },
    description: 'Rímskokatolícka cirkev – Žilinská diecéza: aktuality, kalendár akcií, biskup, kúria, farnosti a kňazi.',
    icons: { icon: '/dcza/erb-240.png' },
    alternates: { canonical: path },
    openGraph: { siteName: 'Žilinská diecéza', locale: 'sk_SK', type: 'website', url: path },
  }
}

export default async function DczaLayout({ children }: { children: React.ReactNode }) {
  const nav = mainNav(await getPageTree(), await listCuriaLinks())
  return (
    <div className="flex flex-col min-h-screen bg-paper-warm text-ink">
      <ScrollProgress />
      <DczaHeader nav={nav} />
      <main className="grow">{children}</main>
      <DczaFooter nav={nav} />
    </div>
  )
}
