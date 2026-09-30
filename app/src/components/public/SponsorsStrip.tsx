'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, X } from 'lucide-react'
import { getPublicSponsors } from '@/app/(public)/actions'
import { formatSponsorAmount, type PublicSponsor } from '@/lib/sponsors/types'
import { trackEvent } from '@/lib/analytics'

/** Tónovanie bielej dlaždice do farby stránky (rovnaký princíp ako Photo na súťaži). */
const TILE_TINT = 0.1

/**
 * Pás „Podporili nás“ na domovskej stránke: mriežka lôg (ako na lectio.one) – zalamuje sa
 * do riadkov a je vycentrovaná, na konci dlaždica „Miesto pre vás“. Klik na logo
 * otvorí okno s detailom sponzora (logo, názov, popis, suma, tlačidlo na web).
 * Otvorenie okna aj klik na web sa posielajú do Umami.
 */
export default function SponsorsStrip() {
  const [sponsors, setSponsors] = useState<PublicSponsor[] | null>(null)
  const [selected, setSelected] = useState<PublicSponsor | null>(null)

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

  const open = (s: PublicSponsor) => {
    setSelected(s)
    trackEvent('sponsor_open', { sponsor: s.name })
  }

  return (
    <section id="podporili-nas" className="relative py-20 md:py-24 bg-blue-deep border-t border-white/5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-gold/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
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

        <LogoGrid sponsors={sponsors} onSelect={open} />
      </div>

      {selected && <SponsorModal sponsor={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

function LogoTile({ sponsor, onClick }: { sponsor: PublicSponsor; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={sponsor.description ?? sponsor.name}
      className="group relative w-full h-28 sm:h-32 rounded-2xl overflow-hidden bg-white border border-white/10 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-gold/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/40 cursor-pointer"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-5 gap-2">
        {sponsor.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sponsor.logo_url} alt={sponsor.name} loading="lazy" className="max-h-16 sm:max-h-20 max-w-[85%] object-contain" />
        ) : (
          <span className="text-blue-deep font-extrabold text-lg text-center leading-tight px-2">{sponsor.name}</span>
        )}
      </div>
      {/* Tón stránky cez dlaždicu, zmizne pri hoveri, aby logo vyniklo */}
      <div
        className="absolute inset-0 bg-blue-deep pointer-events-none transition-opacity duration-300 group-hover:opacity-0"
        style={{ opacity: TILE_TINT }}
      />
      <div className="absolute inset-0 ring-1 ring-inset ring-blue-deep/10 rounded-2xl pointer-events-none" />
    </button>
  )
}

function LogoGrid({ sponsors, onSelect }: { sponsors: PublicSponsor[]; onSelect: (s: PublicSponsor) => void }) {
  const tile = 'w-[calc(50%-0.625rem)] sm:w-[200px] lg:w-[180px] xl:w-[190px]'
  return (
    <div className="flex flex-wrap justify-center gap-5">
      {sponsors.map((s) => (
        <div key={s.id} className={tile}>
          <LogoTile sponsor={s} onClick={() => onSelect(s)} />
        </div>
      ))}
      {/* Pozvánka pre ďalších partnerov */}
      <div className={tile}>
        <Link
          href="/kontakt"
          className="group w-full h-28 sm:h-32 rounded-2xl border-2 border-dashed border-white/20 hover:border-gold/60 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center text-center p-4 transition-colors"
        >
          <span className="text-sm font-extrabold text-white group-hover:text-gold-bright">Miesto pre vás</span>
          <span className="text-xs text-zinc-400 mt-1">Staňte sa partnerom</span>
        </Link>
      </div>
    </div>
  )
}

function SponsorModal({ sponsor, onClose }: { sponsor: PublicSponsor; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const host = sponsor.website_url ? sponsor.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-deep/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zavrieť"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-blue-deep/70 border border-white/15 text-zinc-300 hover:text-white hover:border-gold/50 flex items-center justify-center cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="bg-white p-8 flex items-center justify-center min-h-[160px]">
          {sponsor.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-28 max-w-[80%] object-contain" />
          ) : (
            <span className="text-blue-deep font-extrabold text-2xl text-center">{sponsor.name}</span>
          )}
        </div>

        <div className="p-6 sm:p-8 space-y-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-bright mb-1">Partner fondu KROK</p>
            <h3 id="sponsor-modal-title" className="text-2xl font-extrabold leading-tight">{sponsor.name}</h3>
          </div>
          {sponsor.description && <p className="text-sm text-zinc-300 font-light leading-relaxed">{sponsor.description}</p>}
          {sponsor.amount != null && (
            <p className="text-sm text-zinc-300">
              Výška podpory: <strong className="text-gold-bright font-extrabold">{formatSponsorAmount(sponsor.amount)}</strong>
            </p>
          )}
          {sponsor.website_url && (
            <a
              href={sponsor.website_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackEvent('sponsor_website_click', { sponsor: sponsor.name, url: sponsor.website_url ?? '' })}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold rounded-2xl text-sm shadow-xl hover:shadow-gold/20 transition-all"
            >
              <ExternalLink size={16} /> Navštíviť web{host ? ` (${host})` : ''}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
