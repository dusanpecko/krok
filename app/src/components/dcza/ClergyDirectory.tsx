'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Mail, Search } from 'lucide-react'
import type { PublicClergySummary } from '@/lib/diocese/schematizmus'

type Filter = 'all' | 'priests' | 'deacons' | 'retired'
const FILTERS: [Filter, string][] = [
  ['all', 'Všetci'],
  ['priests', 'Kňazi'],
  ['deacons', 'Diakoni'],
  ['retired', 'Na odpočinku'],
]
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Zoznam kňazov a diakonov – vyhľadávanie, dekanát, abeceda (ako dcza.sk/schematizmus/knazi). */
export default function ClergyDirectory({ clergy, deaneries }: { clergy: PublicClergySummary[]; deaneries: { id: string; name: string }[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [deanery, setDeanery] = useState('')

  const list = useMemo(() => {
    const needle = fold(q.trim())
    return clergy.filter((c) => {
      if (filter === 'priests' && !['priest', 'bishop'].includes(c.category)) return false
      if (filter === 'deacons' && !['deacon', 'permanent_deacon'].includes(c.category)) return false
      if (filter === 'retired' && !c.retired) return false
      if (deanery && c.deanery?.id !== deanery) return false
      if (!needle) return true
      return fold(`${c.name} ${c.email ?? ''} ${c.functions.map((f) => `${f.role} ${f.place ?? ''}`).join(' ')}`).includes(needle)
    })
  }, [clergy, q, filter, deanery])

  const letters = Array.from(new Set(list.map((c) => c.letter)))

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meno, farnosť alebo funkcia…" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-blue/15 focus:outline-none focus:ring-4 focus:ring-blue/10" />
        </div>
        <select value={deanery} onChange={(e) => setDeanery(e.target.value)} className="px-4 py-3.5 rounded-2xl bg-white border border-blue/15 font-bold text-sm">
          <option value="">Všetky dekanáty</option>
          {deaneries.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`px-3.5 py-1.5 rounded-full text-sm font-bold cursor-pointer ${filter === k ? 'bg-blue text-white' : 'bg-white border border-blue/15 text-ink/80 hover:border-blue/40'}`}>
            {l}
          </button>
        ))}
        <span className="text-sm text-mute self-center ml-2">{list.length} osôb</span>
      </div>
      {letters.length > 1 && !q && (
        <div className="flex flex-wrap gap-1 mb-6">
          {letters.map((l) => (
            <a key={l} href={`#pismeno-${l}`} className="w-8 h-8 rounded-lg bg-white border border-blue/10 text-sm font-extrabold flex items-center justify-center hover:border-gold">
              {l}
            </a>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <p className="rounded-2xl bg-white border border-blue/10 p-8 text-center text-mute">Nikto nevyhovuje hľadaniu.</p>
      ) : (
        letters.map((l) => (
          <section key={l} id={`pismeno-${l}`} className="scroll-mt-32 mb-8">
            <h2 className="text-2xl font-light text-gold-ink mb-3">{l}</h2>
            <ul className="grid md:grid-cols-2 gap-2">
              {list
                .filter((c) => c.letter === l)
                .map((c) => (
                  <li key={c.slug} className="rounded-2xl bg-white border border-blue/10 hover:border-gold/60 transition-colors">
                    <Link href={`/schematizmus/knazi/${c.slug}`} className="block px-4 pt-3 pb-1">
                      <p className="font-extrabold">{c.name}</p>
                      <p className="text-sm text-mute">
                        {c.retired ? 'na odpočinku' : c.functions.slice(0, 2).map((f) => (f.place ? `${f.role} – ${f.place}` : f.role)).join(', ') || '—'}
                      </p>
                    </Link>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 px-4 pb-3 text-sm font-bold text-blue hover:underline break-all">
                        <Mail size={13} className="shrink-0" /> {c.email}
                      </a>
                    ) : (
                      <div className="pb-2" />
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
