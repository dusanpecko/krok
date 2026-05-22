'use client'

import { Edit2, Trash2, Map, Search } from 'lucide-react'
import { useState } from 'react'

interface Deanery {
  id: string
  name: string
  parishes_count?: number
}

interface DeaneryTableProps {
  deaneries: Deanery[]
  onEdit: (deanery: Deanery) => void
  onDelete: (id: string) => Promise<void>
}

export default function DeaneryTable({ deaneries, onEdit, onDelete }: DeaneryTableProps) {
  const [search, setSearch] = useState('')

  const filteredDeaneries = deaneries.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative group max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Hľadať dekanát..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Názov dekanátu</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Počet farností</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredDeaneries.map((deanery) => (
              <tr key={deanery.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Map size={16} />
                    </div>
                    <span className="font-bold text-gray-900">{deanery.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold font-mono">
                    {deanery.parishes_count || 0}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(deanery)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100"
                      title="Upraviť"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(deanery.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100"
                      title="Zmazať"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDeaneries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center text-gray-400 italic">
                  Nenašli sa žiadne dekanáty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
