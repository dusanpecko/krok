import type { Metadata } from 'next'
import { ExternalLink, Globe } from 'lucide-react'
import { getMagazine } from '@/lib/diocese/public'
import SocialIcon from '@/components/parishes/SocialIcon'

/** Web a siete redakcie časopisu (pripomienky Julie 2026-10-12) */
const MAGAZINE_LINKS = [
  { href: 'https://www.nasadieceza.sk/', label: 'nasadieceza.sk', icon: <Globe size={17} /> },
  { href: 'https://www.facebook.com/nasazilinskadieceza', label: 'Facebook', icon: <SocialIcon kind="facebook" size={17} /> },
  { href: 'https://www.instagram.com/nasazilinskadieceza', label: 'Instagram', icon: <SocialIcon kind="instagram" size={17} /> },
]

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Časopis Naša Žilinská diecéza' }

export default async function DczaMagazine() {
  const issues = await getMagazine(60)
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Časopis</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-3">Naša Žilinská diecéza</h1>
      <p className="text-mute mb-5 max-w-2xl">Diecézny mesačník – e-časopis si môžete zakúpiť na portáli Zachej.sk.</p>
      <div className="flex flex-wrap gap-3 mb-10">
        {MAGAZINE_LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue/10 text-sm font-extrabold text-blue hover:border-gold/60 hover:shadow-sm transition-all">
            {l.icon} {l.label} <ExternalLink size={13} className="opacity-50" />
          </a>
        ))}
      </div>
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
              {m.title.startsWith('Naša Žilinská diecéza') ? 'Kúpiť e-časopis' : m.title} <ExternalLink size={13} className="opacity-50" />
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
