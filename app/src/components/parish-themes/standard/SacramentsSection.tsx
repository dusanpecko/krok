'use client'

import { useState } from 'react'
import { BookOpen, Cross, Droplets, Flame, HandHeart, HeartHandshake, KeyRound, Wheat, type LucideIcon } from 'lucide-react'
import type { PublicSacrament } from '@/lib/parishes/public'
import { NON_SACRAMENT_TYPES } from '@/lib/parishes/format'

const ICONS: Record<string, LucideIcon> = {
  krst: Droplets,
  eucharistia: Wheat,
  birmovka: Flame,
  manzelstvo: HeartHandshake,
  pomazanie: HandHeart,
  pohreb: Cross,
  zmierenie: KeyRound,
}

/** Sviatosti ako dlaždice s ikonou; po kliknutí sa pod nimi rozbalí text. */
export default function SacramentsSection({ sacraments }: { sacraments: PublicSacrament[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const current = sacraments.find((s) => s.type === open)

  const tile = (s: PublicSacrament) => {
    const Icon = ICONS[s.type] ?? BookOpen
    const active = s.type === open
    return (
      <button
        key={s.type}
        type="button"
        onClick={() => setOpen(active ? null : s.type)}
        aria-expanded={active}
        className={`w-[calc(50%-6px)] sm:w-32 flex flex-col items-center gap-3 p-4 rounded-2xl border text-center cursor-pointer transition-colors ${
          active ? 'bg-gold/15 border-gold text-gold-ink' : 'bg-white/[0.04] border-blue/10 hover:border-gold/40 hover:text-gold-bright'
        }`}
      >
        <span className={`w-14 h-14 rounded-full flex items-center justify-center border ${active ? 'border-gold bg-gold/10' : 'border-gold/30 bg-white'} text-gold-ink`}>
          <Icon size={26} strokeWidth={1.6} />
        </span>
        <span className="text-sm font-extrabold leading-tight">{s.title}</span>
      </button>
    )
  }
  const sacr = sacraments.filter((s) => !NON_SACRAMENT_TYPES.includes(s.type))
  const other = sacraments.filter((s) => NON_SACRAMENT_TYPES.includes(s.type))

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {sacr.map(tile)}
        {sacr.length > 0 && other.length > 0 && (
          <>
            <span aria-hidden className="hidden sm:block w-px self-stretch bg-blue/10 mx-2" />
            <span aria-hidden className="basis-full h-px bg-blue-soft/60 sm:hidden" />
          </>
        )}
        {other.map(tile)}
      </div>
      {current && (
        <div className="mt-4 bg-white/[0.04] border border-gold/30 rounded-2xl p-6">
          <h3 className="text-xl font-light text-gold-ink mb-3">{current.title}</h3>
          <div className="simple-rich-editor leading-relaxed text-ink/85" dangerouslySetInnerHTML={{ __html: current.content }} />
        </div>
      )}
    </div>
  )
}
