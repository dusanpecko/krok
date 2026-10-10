import type { Metadata } from 'next'
import { getPublicParishList } from '@/lib/parishes/public'
import ParishDirectory from '@/components/public/parishes/ParishDirectory'
import { getSite, parishCanonicalSite, siteBaseUrl } from '@/lib/site-server'

export const dynamic = 'force-dynamic'

/** Názov podľa webu (KROK / Žilinská diecéza), canonical podľa O72 – rovnako ako stránky farností. */
export async function generateMetadata(): Promise<Metadata> {
  const brand = (await getSite()) === 'dcza' ? 'Žilinská diecéza' : 'KROK'
  const url = `${siteBaseUrl(parishCanonicalSite())}/farnosti`
  return {
    title: `Farnosti Žilinskej diecézy – bohoslužby a oznamy | ${brand}`,
    description: 'Nájdite svoju farnosť podľa obce: rozpis svätých omší, spovedanie, farské oznamy a kontakt na farský úrad v Žilinskej diecéze.',
    alternates: { canonical: url },
    openGraph: {
      title: `Farnosti Žilinskej diecézy | ${brand}`,
      description: 'Sväté omše, oznamy a kontakty farností – vyhľadávanie podľa obce.',
      type: 'website',
      url,
    },
  }
}

/** Zoznam všetkých aktívnych farností + vyhľadávanie podľa obce, patróna a polohy (návrh § 4.2). */
export default async function FarnostiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [parishes, { q }] = await Promise.all([getPublicParishList(), searchParams])
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-paper-warm min-h-screen text-ink pb-24 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        <header className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue mb-4">Žilinská diecéza</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Farnosti</h1>
          <p className="text-mute text-base sm:text-lg leading-relaxed">
            Rozpis svätých omší, farské oznamy a kontakty. Hľadajte podľa názvu farnosti alebo podľa obce, v ktorej bývate.
          </p>
        </header>
        <ParishDirectory parishes={parishes} initialQuery={typeof q === 'string' ? q.slice(0, 100) : ''} />
      </div>
    </div>
  )
}
