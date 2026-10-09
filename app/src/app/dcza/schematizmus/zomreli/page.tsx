import type { Metadata } from 'next'
import { listDeceasedClergy } from '@/lib/diocese/schematizmus'
import { shortDate } from '@/lib/diocese/format'
import SchemaNav from '@/components/dcza/SchemaNav'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Schematizmus – zomrelí kňazi' }

export default async function DeceasedPage() {
  const list = await listDeceasedClergy()
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Schematizmus</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">Zomrelí kňazi</h1>
      <SchemaNav active="/schematizmus/zomreli" />
      <p className="text-mute mb-6 italic">Odpočinutie večné daj im, Pane, a svetlo večné nech im svieti.</p>
      <ul className="divide-y divide-blue/10 rounded-3xl bg-white border border-blue/10">
        {list.map((c, i) => (
          <li key={i} className="px-5 py-3 flex flex-wrap justify-between gap-2">
            <span className="font-extrabold">{c.name}</span>
            <span className="text-sm text-mute">{[c.death_date ? `† ${shortDate(c.death_date)}` : null, c.death_place].filter(Boolean).join(', ')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
