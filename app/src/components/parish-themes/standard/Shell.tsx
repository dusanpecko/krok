import Link from 'next/link'
import { Church, Eye, MapPin } from 'lucide-react'
import type { PublicParish } from '@/lib/parishes/public'
import { parishDisplayName } from '@/lib/parishes/format'

type Section = 'home' | 'announcement' | 'news'

/** Rámec štandardného motívu: hlavička farnosti, navigácia, upozornenie na náhľad. */
export default function Shell({ parish, active, children, compact = false }: { parish: PublicParish; active: Section; children: React.ReactNode; compact?: boolean }) {
  const base = `/farnosti/${parish.slug}`
  const nav: { key: Section; label: string; href: string }[] = [
    { key: 'home', label: 'Farnosť', href: base },
    { key: 'announcement', label: 'Oznamy', href: `${base}/oznamy` },
    { key: 'news', label: 'Aktuality', href: `${base}/aktuality` },
  ]
  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />
      {parish.image_url && !compact && (
        <div className="absolute inset-x-0 top-0 h-[520px] pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={parish.image_url} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-deep/40 via-blue-deep/70 to-blue-deep" />
        </div>
      )}

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        {parish.preview && (
          <div className="mb-8 flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-400/15 border border-amber-300/40 text-amber-100 text-sm font-bold">
            <Eye size={16} className="shrink-0" /> Náhľad – stránka farnosti zatiaľ nie je zverejnená. Vidíte ju len vy a biskupský úrad.
          </div>
        )}

        <header className={compact ? 'mb-8' : 'mb-10'}>
          <Link href="/farnosti" className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright hover:underline">
            Farnosti Žilinskej diecézy
          </Link>
          <h1 className={`${compact ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl'} font-light tracking-tight mt-3 flex items-start gap-3`}>
            {!compact && <Church className="w-9 h-9 sm:w-11 sm:h-11 text-gold shrink-0 mt-1" />}
            {parishDisplayName(parish)}
          </h1>
          {!compact && (
            <p className="mt-3 text-blue-100/70 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {parish.patrocinium && <span>{parish.patrocinium}</span>}
              {parish.deanery_name && <span>Dekanát {parish.deanery_name}</span>}
              {parish.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {parish.city}
                </span>
              )}
            </p>
          )}
        </header>

        <nav className="flex gap-2 mb-10 overflow-x-auto pb-1">
          {nav.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold border whitespace-nowrap transition-all ${
                active === n.key ? 'bg-gold/15 border-gold text-gold-bright' : 'bg-white/5 border-white/10 text-blue-50 hover:border-gold/40 hover:text-gold-bright'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  )
}

export function SectionHeading({ id, children, icon }: { id?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-32 flex items-center gap-3 text-xl sm:text-2xl font-light tracking-tight mb-6">
      {icon && <span className="text-gold">{icon}</span>}
      {children}
      <span className="flex-1 h-px bg-white/10 ml-2" />
    </h2>
  )
}

export const cardCls = 'bg-white/[0.04] border border-white/10 rounded-2xl'
