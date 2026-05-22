'use client'

import { useState } from 'react'
import { Edit2, Trash2, Church, Search, Users2, Map } from 'lucide-react'

interface Parish {
  id: string
  name: string
  city?: string | null
  postal_code?: string | null
  deanery?: { name: string } | null
  donors_count?: number
}

interface ParishTableProps {
  parishes: Parish[]
  onEdit: (parish: Parish) => void
  onDelete: (id: string) => Promise<void>
}

export default function ParishTable({ parishes, onEdit, onDelete }: ParishTableProps) {
  const [search, setSearch] = useState('')

  const filtered = parishes.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.deanery?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="relative group max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Hľadať farnosť alebo dekanát..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Farnosť</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Dekanát</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Lokalita</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Darcovia</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(parish => (
              <tr key={parish.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                      <Church size={16} />
                    </div>
                    <span className="font-bold text-gray-900 leading-tight">{parish.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  {parish.deanery ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Map size={14} className="text-gray-400 shrink-0" />
                      {parish.deanery.name}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 italic">–</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm text-gray-500">
                    {[parish.city, parish.postal_code].filter(Boolean).join(' ') || '–'}
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
                    <Users2 size={12} className="text-gray-400" />
                    <span className="text-xs font-bold font-mono text-gray-600">{parish.donors_count || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(parish)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100"
                      title="Upraviť"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(parish.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100"
                      title="Zmazať"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic text-sm">
                  Nenašli sa žiadne farnosti.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-8 py-3 border-t border-gray-50 bg-gray-50/30">
          <p className="text-xs text-gray-400 font-mono">
            Zobrazené: <span className="font-bold text-gray-600">{filtered.length}</span> z <span className="font-bold text-gray-600">{parishes.length}</span> farností
          </p>
        </div>
      </div>
    </div>
  )
}
