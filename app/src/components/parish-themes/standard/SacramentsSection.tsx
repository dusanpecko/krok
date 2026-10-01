'use client'

import { useState } from 'react'
import { BookOpen, Cross, Droplets, Flame, HandHeart, HeartHandshake, KeyRound, Wheat, type LucideIcon } from 'lucide-react'
import type { PublicSacrament } from '@/lib/parishes/public'

const ICONS: Record<string, LucideIcon> = {
  krst: Droplets,
  'prve-sv-prijimanie': Wheat,
  birmovka: Flame,
  manzelstvo: HeartHandshake,
  pomazanie: HandHeart,
  pohreb: Cross,
  spoved: KeyRound,
}

/** Sviatosti ako dlaždice s ikonou; po kliknutí sa pod nimi rozbalí text. */
export default function SacramentsSection({ sacraments }: { sacraments: PublicSacrament[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const current = sacraments.find((s) => s.type === open)

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {sacraments.map((s) => {
          const Icon = ICONS[s.type] ?? BookOpen
          const active = s.type === open
          return (
            <button
              key={s.type}
              type="button"
              onClick={() => setOpen(active ? null : s.type)}
              aria-expanded={active}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center cursor-pointer transition-colors ${
                active ? 'bg-gold/15 border-gold text-gold-bright' : 'bg-white/[0.04] border-white/10 hover:border-gold/40 hover:text-gold-bright'
              }`}
            >
              <span className={`w-14 h-14 rounded-full flex items-center justify-center border ${active ? 'border-gold bg-gold/10' : 'border-gold/30 bg-white/5'} text-gold`}>
                <Icon size={26} strokeWidth={1.6} />
              </span>
              <span className="text-sm font-extrabold leading-tight">{s.title}</span>
            </button>
          )
        })}
      </div>
      {current && (
        <div className="mt-4 bg-white/[0.04] border border-gold/30 rounded-2xl p-6">
          <h3 className="text-xl font-light text-gold-bright mb-3">{current.title}</h3>
          <div className="theme-dark simple-rich-editor leading-relaxed text-blue-50/90" dangerouslySetInnerHTML={{ __html: current.content }} />
        </div>
      )}
    </div>
  )
}
