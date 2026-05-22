'use client'

import { useState } from 'react'
import { Edit2, Trash2, FolderHeart, Search, CreditCard, Activity, Calendar } from 'lucide-react'

interface Project {
  id: string
  name: string
  category?: string
  status?: string
  target_amount?: number | null
  specific_symbol?: string | null
  donors_count?: number
}

interface ProjectTableProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => Promise<void>
}

export default function ProjectTable({ projects, onEdit, onDelete }: ProjectTableProps) {
  const [search, setSearch] = useState('')

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.specific_symbol || '').includes(search)
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Aktívny</span>
      case 'completed': return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">Ukončený</span>
      case 'draft': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Návrh</span>
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative group max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Hľadať projekt (meno, ŠS)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Názov projektu a kategória</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Špecifický symbol</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Stav</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Darcovia</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(project => (
              <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <FolderHeart size={20} />
                    </div>
                    <div>
                        <span className="font-bold text-gray-900 block leading-tight">{project.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{project.category}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  {project.specific_symbol ? (
                    <div className="flex items-center gap-2">
                       <CreditCard size={14} className="text-blue-400" />
                       <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                         {project.specific_symbol}
                       </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">–</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  {getStatusBadge(project.status || '')}
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold font-mono">
                    {project.donors_count || 0}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(project)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(project.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-24 text-center text-gray-400 space-y-3">
                  <FolderHeart size={32} className="mx-auto text-gray-300" />
                  <p className="text-sm italic">Nenašli sa žiadne projekty.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
