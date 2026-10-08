import Link from 'next/link'
import { Church, Search } from 'lucide-react'

/** Domovská stránka: „Nájdite svoju farnosť“ – obyčajný formulár na /farnosti?q= (funguje aj bez JavaScriptu). */
export default function ParishFinder() {
  return (
    <section id="farnosti" className="relative py-24 md:py-28 bg-white border-t border-blue/10 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-gold/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <Church className="mx-auto text-gold-ink mb-5" size={32} />
        <h2 className="text-3xl sm:text-4xl font-light text-ink tracking-tight leading-tight">Nájdite svoju farnosť</h2>
        <p className="text-ink/80 text-base font-light leading-relaxed mt-4 mb-8">
          Sväté omše, farské oznamy a kontakt na farský úrad vo farnostiach Žilinskej diecézy. Stačí napísať obec, v ktorej bývate.
        </p>
        <form action="/farnosti" method="get" className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="search"
              name="q"
              required
              placeholder="Napríklad Rajecké Teplice…"
              aria-label="Obec alebo farnosť"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-paper-warm border border-blue/15 text-ink placeholder:text-mute/60 focus:outline-none focus:border-gold"
            />
          </label>
          <button type="submit" className="px-6 py-3.5 rounded-xl bg-gold text-blue-deep font-black hover:bg-gold-bright">
            Hľadať
          </button>
        </form>
        <Link href="/farnosti" className="inline-block mt-5 text-sm font-extrabold text-blue hover:underline">
          Zoznam všetkých farností
        </Link>
      </div>
    </section>
  )
}
