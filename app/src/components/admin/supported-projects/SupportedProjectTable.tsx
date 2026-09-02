'use client'

import { useState } from 'react'
import { Edit2, Trash2, FolderHeart, Search, Eye, EyeOff } from 'lucide-react'
import type { SupportedProject } from './SupportedProjectDialog'

interface SupportedProjectTableProps {
  projects: SupportedProject[]
  onEdit: (project: SupportedProject) => void
  onDelete: (id: string) => Promise<void>
}

function formatEur(amount: number) {
  return `${new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 0 }).format(amount)} €`
}

export default function SupportedProjectTable({
  projects,
  onEdit,
  onDelete,
}: SupportedProjectTableProps) {
  const [search, setSearch] = useState('')

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.organizer || '').toLowerCase().includes(search.toLowerCase()) ||
      p.year.toString().includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="relative group max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
        />
        <input
          type="text"
          placeholder="Hľadať projekt (názov, organizátor, rok)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Rok</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Názov a organizátor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Typ</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Suma</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Poradie</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Web</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((project) => (
              <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-5">
                  <span className="text-sm font-black text-gray-900">{project.year}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    {project.image_url ? (
                      <img
                        src={project.image_url}
                        alt={project.name}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <FolderHeart size={20} />
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-gray-900 block leading-tight">
                        {project.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {project.organizer || '–'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  {project.support_type === 'grant' ? (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      Grantová
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      Negrantová
                    </span>
                  )}
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="text-sm font-black text-gray-900 font-mono whitespace-nowrap">
                    {project.amount != null ? formatEur(Number(project.amount)) : '–'}
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold font-mono">
                    {project.sort_order}
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  {project.visible ? (
                    <Eye size={16} className="inline text-green-500" />
                  ) : (
                    <EyeOff size={16} className="inline text-gray-300" />
                  )}
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
                <td colSpan={7} className="px-8 py-24 text-center text-gray-400 space-y-3">
                  <FolderHeart size={32} className="mx-auto text-gray-300" />
                  <p className="text-sm italic">Nenašli sa žiadne podporené projekty.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
