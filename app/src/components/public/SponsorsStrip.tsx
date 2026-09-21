'use client'

import { useEffect, useState } from 'react'
import { getPublicSponsors } from '@/app/(public)/actions'
import { formatSponsorAmount, type PublicSponsor } from '@/lib/sponsors/types'

/**
 * Pás „Podporili nás“ na domovskej stránke. Logá na bielych dlaždiciach, aby
 * fungovali rôznofarebné logá na tmavom podklade. Ak nie je žiadny sponzor,
 * sekcia sa nevykreslí.
 */
export default function SponsorsStrip() {
  const [sponsors, setSponsors] = useState<PublicSponsor[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getPublicSponsors()
      .then((list) => {
        if (!cancelled) setSponsors(list)
      })
      .catch(() => {
        if (!cancelled) setSponsors([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!sponsors || sponsors.length === 0) return null

  return (
    <section id="podporili-nas" className="relative py-20 md:py-24 bg-blue-deep border-t border-white/5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-gold/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-3 text-gold-bright uppercase tracking-widest text-xs font-extrabold mb-4">
            <span className="w-8 h-[2px] bg-gold rounded-full" />
            <span>Partneri fondu</span>
            <span className="w-8 h-[2px] bg-gold rounded-full" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight leading-tight">Podporili nás</h2>
          <p className="text-zinc-300 text-base font-light leading-relaxed mt-4">
            Ďakujeme partnerom, ktorí pomáhajú, aby pastoračné dielo v našej diecéze mohlo rásť.
          </p>
        </div>

        <ul className={`grid gap-4 sm:gap-5 ${sponsors.length <= 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
          {sponsors.map((s) => {
            const tile = (
              <>
                <div className="flex-1 w-full flex items-center justify-center min-h-[72px]">
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt={s.name} loading="lazy" className="max-h-16 sm:max-h-20 max-w-full object-contain" />
                  ) : (
                    <span className="text-blue-deep font-extrabold text-lg text-center leading-tight">{s.name}</span>
                  )}
                </div>
                <div className="text-center mt-3">
                  <span className="block text-[11px] font-bold text-blue-deep/70 truncate">{s.name}</span>
                  {s.amount != null && <span className="block text-[10px] text-blue-deep/50">{formatSponsorAmount(s.amount)}</span>}
                </div>
              </>
            )
            const cls =
              'group flex flex-col items-center bg-white rounded-2xl p-5 sm:p-6 shadow-xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-gold/20 h-full'
            return (
              <li key={s.id} className="h-full">
                {s.website_url ? (
                  <a href={s.website_url} target="_blank" rel="noopener noreferrer sponsored" title={s.description ?? s.name} className={cls}>
                    {tile}
                  </a>
                ) : (
                  <div title={s.description ?? s.name} className={cls}>
                    {tile}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
