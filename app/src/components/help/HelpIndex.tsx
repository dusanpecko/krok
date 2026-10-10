'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'

export interface HelpIndexItem {
  slug: string
  title: string
  summary: string | null
  /** čistý text návodu – na vyhľadávanie */
  text: string
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Zoznam návodov s vyhľadávaním (bez diakritiky, v názve, popise aj texte). */
export default function HelpIndex({ base, items }: { base: string; items: HelpIndexItem[] }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean)
    if (!words.length) return items
    return items.filter((a) => {
      const hay = fold(`${a.title} ${a.summary ?? ''} ${a.text}`)
      return words.every((w) => hay.includes(w))
    })
  }, [q, items])

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hľadať v návodoch… (napr. oznam, fotky, heslo)"
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl bg-white border border-gray-100 p-6 text-sm text-gray-500">
          {items.length === 0 ? 'Návody sa pripravujú.' : 'Nič sme nenašli. Skúste iné slovo.'}
        </p>
      ) : (
        <ul className="rounded-2xl bg-white border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {shown.map((a) => (
            <li key={a.slug}>
              <Link href={`${base}/${a.slug}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 group">
                <span className="min-w-0">
                  <span className="block font-bold text-gray-900 group-hover:text-blue-600">{a.title}</span>
                  {a.summary && <span className="block text-sm text-gray-500 mt-0.5">{a.summary}</span>}
                </span>
                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
