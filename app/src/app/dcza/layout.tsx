import type { Metadata } from 'next'
import { getPageTree } from '@/lib/diocese/public'
import { mainNav } from '@/lib/diocese/nav'
import { listCuriaLinks } from '@/lib/diocese/schematizmus'
import DczaHeader from '@/components/dcza/DczaHeader'
import DczaFooter from '@/components/dcza/DczaFooter'

/** Web diecézy dcza.sk (krok_navrh_farnosti.md § 20). Na dcza.sk sem middleware prepisuje všetky nespoločné cesty. */
export const metadata: Metadata = {
  title: { default: 'Žilinská diecéza – Rímskokatolícka cirkev', template: '%s | Žilinská diecéza' },
  description: 'Rímskokatolícka cirkev – Žilinská diecéza: aktuality, kalendár akcií, biskup, kúria, farnosti a kňazi.',
  icons: { icon: '/dcza/erb-240.png' },
}

export default async function DczaLayout({ children }: { children: React.ReactNode }) {
  const nav = mainNav(await getPageTree(), await listCuriaLinks())
  return (
    <div className="flex flex-col min-h-screen bg-paper-warm text-ink">
      <DczaHeader nav={nav} />
      <main className="flex-grow">{children}</main>
      <DczaFooter nav={nav} />
    </div>
  )
}
