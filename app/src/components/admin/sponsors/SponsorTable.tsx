'use client'

import { useState } from 'react'
import { Edit2, Trash2, Search, Handshake, ExternalLink, Eye, EyeOff, CalendarRange } from 'lucide-react'
import { formatSponsorAmount, isSponsorPublished, type Sponsor } from '@/lib/sponsors/types'

interface Props {
  sponsors: Sponsor[]
  onEdit: (s: Sponsor) => void
  onDelete: (id: string) => Promise<void>
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('sk-SK') : null
}

export default function SponsorTable({ sponsors, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = sponsors.filter((s) => s.name.toLowerCase().includes(q) || (s.website_url ?? '').toLowerCase().includes(q))

  return (
    <div className="space-y-6">
      <div className="relative group max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Hľadať sponzora (názov, web)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[820px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Sponzor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Podpora</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Zverejnenie</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Poradie</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s) => {
              const published = isSponsorPublished(s)
              return (
                <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                        {s.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Handshake size={18} className="text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-gray-900 block leading-tight truncate">{s.name}</span>
                        {s.website_url && (
                          <a href={s.website_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[260px]">
                            <ExternalLink size={10} /> {s.website_url.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {s.amount != null ? (
                      <div>
                        <span className="text-sm font-bold text-gray-900">{formatSponsorAmount(s.amount, s.currency)}</span>
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${s.amount_public ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {s.amount_public ? 'suma verejná' : 'suma interná'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 italic">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {published ? <Eye size={10} /> : <EyeOff size={10} />} {published ? 'na webe' : s.is_active ? 'mimo obdobia' : 'neaktívny'}
                      </span>
                      {(s.publish_from || s.publish_until) && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <CalendarRange size={11} /> {fmtDate(s.publish_from) ?? '…'} – {fmtDate(s.publish_until) ?? '…'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold font-mono">{s.sort_order}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100 cursor-pointer" title="Upraviť">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100 cursor-pointer" title="Zmazať">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-24 text-center text-gray-400 space-y-3">
                  <Handshake size={32} className="mx-auto text-gray-300" />
                  <p className="text-sm italic">Zatiaľ žiadni sponzori.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
