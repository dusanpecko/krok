'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Church, MapPin, Search } from 'lucide-react'
import type { PublicParishListItem } from '@/lib/parishes/public'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Vyhľadávanie farnosti podľa názvu aj obce (ľudia hľadajú svoju dedinu, nie názov farnosti). */
export default function ParishDirectory({ parishes }: { parishes: PublicParishListItem[] }) {
  const [q, setQ] = useState('')
  const [deanery, setDeanery] = useState('')
  const deaneries = useMemo(
    () => [...new Map(parishes.filter((p) => p.deanery_id).map((p) => [p.deanery_id!, p.deanery_name ?? ''])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'sk')),
    [parishes],
  )
  const query = norm(q.trim())
  const filtered = parishes
    .filter((p) => !deanery || p.deanery_id === deanery)
    .map((p) => {
      if (!query) return { p, match: null as string | null }
      if (norm(`${p.name} ${p.official_name ?? ''} ${p.city ?? ''}`).includes(query)) return { p, match: null }
      const village = p.villages.find((v) => norm(v).includes(query))
      return village ? { p, match: village } : null
    })
    .filter(Boolean) as { p: PublicParishListItem; match: string | null }[]

  if (parishes.length === 0) {
    return <p className="text-center py-24 bg-white/5 border border-white/10 rounded-3xl text-blue-100/70">Stránky farností pripravujeme.</p>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-10">
        <label className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-100/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Obec alebo farnosť…"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-blue-100/40 focus:outline-none focus:border-gold"
          />
        </label>
        {deaneries.length > 1 && (
          <select value={deanery} onChange={(e) => setDeanery(e.target.value)} className="px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-gold">
            <option value="" className="text-ink">Všetky dekanáty</option>
            {deaneries.map(([id, name]) => (
              <option key={id} value={id} className="text-ink">
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-blue-100/60 py-16">Nenašli sme farnosť pre „{q}“. Skúste iný názov obce.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ p, match }) => (
            <Link key={p.slug} href={`/farnosti/${p.slug}`} className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:border-gold/40 transition-colors group">
              <p className="font-extrabold flex items-start gap-2 group-hover:text-gold-bright">
                <Church size={18} className="text-gold shrink-0 mt-0.5" /> {p.official_name ?? p.name}
              </p>
              {p.patrocinium && <p className="text-sm text-blue-100/60 mt-1">{p.patrocinium}</p>}
              <p className="text-xs text-blue-100/50 mt-3 flex flex-wrap gap-x-3">
                {p.deanery_name && <span>Dekanát {p.deanery_name}</span>}
                {p.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {p.city}
                  </span>
                )}
              </p>
              {match && <p className="text-xs text-gold-bright mt-2">Obec {match} patrí do tejto farnosti</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
