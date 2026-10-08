import type { Metadata } from 'next'
import { ExternalLink } from 'lucide-react'
import { getMagazine } from '@/lib/diocese/public'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Časopis Naša Žilinská diecéza' }

export default async function DczaMagazine() {
  const issues = await getMagazine(60)
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Časopis</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-3">Naša Žilinská diecéza</h1>
      <p className="text-mute mb-10 max-w-2xl">Diecézny mesačník – e-časopis si môžete zakúpiť na portáli Zachej.sk.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {issues.map((m) => (
          <a key={m.id} href={m.link_url ?? m.pdf_url ?? '#'} target="_blank" rel="noopener noreferrer" className="group">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-white shadow-sm group-hover:shadow-xl transition-shadow">
              {m.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.cover_url} alt={m.title} loading="lazy" className="w-full h-full object-cover" />
              )}
            </div>
            <p className="mt-3 text-xs font-bold text-mute">{m.issue_number}</p>
            <p className="font-extrabold group-hover:text-blue inline-flex items-center gap-1">
              {m.title} <ExternalLink size={13} className="opacity-50" />
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
