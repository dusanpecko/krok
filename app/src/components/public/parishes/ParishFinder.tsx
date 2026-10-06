import Link from 'next/link'
import { Church, Search } from 'lucide-react'

/** Domovská stránka: „Nájdite svoju farnosť“ – obyčajný formulár na /farnosti?q= (funguje aj bez JavaScriptu). */
export default function ParishFinder() {
  return (
    <section id="farnosti" className="relative py-24 md:py-28 bg-blue-deep border-t border-white/5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-gold/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <Church className="mx-auto text-gold mb-5" size={32} />
        <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight leading-tight">Nájdite svoju farnosť</h2>
        <p className="text-zinc-300 text-base font-light leading-relaxed mt-4 mb-8">
          Sväté omše, farské oznamy a kontakt na farský úrad. Stačí napísať obec, v ktorej bývate.
        </p>
        <form action="/farnosti" method="get" className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-100/50" />
            <input
              type="search"
              name="q"
              required
              placeholder="Napríklad Rajecké Teplice…"
              aria-label="Obec alebo farnosť"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-blue-100/40 focus:outline-none focus:border-gold"
            />
          </label>
          <button type="submit" className="px-6 py-3.5 rounded-xl bg-gold text-blue-deep font-black hover:bg-gold-bright">
            Hľadať
          </button>
        </form>
        <Link href="/farnosti" className="inline-block mt-5 text-sm font-extrabold text-gold-bright hover:underline">
          Zoznam všetkých farností
        </Link>
      </div>
    </section>
  )
}
