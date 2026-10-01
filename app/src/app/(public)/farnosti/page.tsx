import type { Metadata } from 'next'
import { getPublicParishList } from '@/lib/parishes/public'
import ParishDirectory from '@/components/public/parishes/ParishDirectory'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Farnosti Žilinskej diecézy – bohoslužby a oznamy | KROK',
  description: 'Nájdite svoju farnosť podľa obce: rozpis svätých omší, spovedanie, farské oznamy a kontakt na farský úrad v Žilinskej diecéze.',
  openGraph: {
    title: 'Farnosti Žilinskej diecézy | KROK',
    description: 'Sväté omše, oznamy a kontakty farností – vyhľadávanie podľa obce.',
    type: 'website',
  },
}

/** Zoznam zverejnených farností + vyhľadávanie podľa obce (návrh § 4.2). */
export default async function FarnostiPage() {
  const parishes = await getPublicParishList()
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        <header className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright mb-4">Žilinská diecéza</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Farnosti</h1>
          <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed">
            Rozpis svätých omší, farské oznamy a kontakty. Hľadajte podľa názvu farnosti alebo podľa obce, v ktorej bývate.
          </p>
        </header>
        <ParishDirectory parishes={parishes} />
      </div>
    </div>
  )
}
