import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, ExternalLink, FileText } from 'lucide-react'
import { dioceseDb } from '@/lib/diocese/public'
import { listDocuments, type DioceseDocument } from '@/lib/diocese/documents'
import { shortDate } from '@/lib/diocese/format'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dokumenty pápežov' }

/** Dokumenty pápežov – zo kbs.sk (otvárajú sa tam) + vlastné dokumenty diecézy (O77). */
export default async function PapalDocuments() {
  const docs = await listDocuments(dioceseDb(), 'dokumenty-papezov')
  const groups: { label: string; items: DioceseDocument[] }[] = []
  for (const d of docs) {
    const label = d.group_label || 'Ďalšie dokumenty'
    const g = groups.find((x) => x.label === label)
    if (g) g.items.push(d)
    else groups.push({ label, items: [d] })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-mute mb-6">
        <Link href="/" className="hover:text-blue">Domov</Link>
        <ChevronRight size={13} />
        <Link href="/dokumenty" className="hover:text-blue">Dokumenty</Link>
        <ChevronRight size={13} />
        <span className="text-ink font-bold">Dokumenty pápežov</span>
      </nav>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight">Dokumenty pápežov</h1>
      <p className="text-mute mt-3 max-w-2xl">
        Encykliky, apoštolské listy a posolstvá v slovenskom preklade. Zoznam sa denne aktualizuje zo stránky Konferencie biskupov Slovenska – dokumenty z kbs.sk sa otvoria
        tam.
      </p>
      <div className="mt-10 space-y-3">
        {groups.map((g, i) => (
          <details key={g.label} open={i < 2} className="group rounded-2xl bg-white border border-blue/10 overflow-hidden">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4 font-extrabold hover:bg-blue-soft/20">
              <span>{g.label}</span>
              <span className="text-sm font-bold text-mute inline-flex items-center gap-2">
                {g.items.length}
                <ChevronRight size={16} className="group-open:rotate-90 transition-transform" />
              </span>
            </summary>
            <ul className="divide-y divide-blue/5 border-t border-blue/10">
              {g.items.map((d) => (
                <li key={d.id}>
                  <a href={d.url} target={d.source === 'kbs' ? '_blank' : undefined} rel={d.source === 'kbs' ? 'noopener noreferrer' : undefined} className="flex items-start gap-3 px-5 py-3 hover:bg-paper-warm">
                    <FileText size={16} className="text-gold-ink shrink-0 mt-0.5" />
                    <span className="flex-1 min-w-0">
                      <span className="font-bold text-ink">{d.title}</span>
                      {(d.description || d.issued_on) && (
                        <span className="block text-sm text-mute">{[d.issued_on ? shortDate(d.issued_on) : null, d.description].filter(Boolean).join(' · ')}</span>
                      )}
                    </span>
                    {d.source === 'kbs' ? (
                      <span className="text-xs font-bold text-mute inline-flex items-center gap-1 shrink-0">
                        kbs.sk <ExternalLink size={11} />
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-blue shrink-0">{d.file_name ? 'Stiahnuť' : 'Otvoriť'}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}
