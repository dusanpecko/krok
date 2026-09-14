'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, Search, Eye, EyeOff, Star, ExternalLink, Megaphone, Users } from 'lucide-react'
import { deleteProject } from '@/app/admin/projekty/actions'
import { categoryLabel, formatEur, statusLabel, type ProjectListItem } from '@/lib/projects/types'
import { Notice } from './ui'

type Filter = 'all' | 'public' | 'internal'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-yellow-100 text-yellow-700',
}

export default function ProjectTable({ projects }: { projects: ProjectListItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const q = search.trim().toLowerCase()
  const filtered = projects.filter((p) => {
    if (filter === 'public' && !p.visible_on_web) return false
    if (filter === 'internal' && p.visible_on_web) return false
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      (p.specific_symbol ?? '').includes(q) ||
      (p.legacy_variable_symbol ?? '').includes(q) ||
      p.slug.includes(q)
    )
  })

  const handleDelete = (p: ProjectListItem) => {
    if (!confirm(`Naozaj chcete zmazať výzvu „${p.name}“? Zmažú sa aj jej fotky, dokumenty, rozpočet a harmonogram.`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteProject(p.id)
      if (res.success) router.refresh()
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative group max-w-md flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Hľadať výzvu (názov, ŠS, VS, slug)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
          {(
            [
              { key: 'all', label: 'Všetky' },
              { key: 'public', label: 'Na webe' },
              { key: 'internal', label: 'Interné' },
            ] as { key: Filter; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === f.key ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Výzva</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Stav</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 w-64">Vyzbierané</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Symboly</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((p) => {
              const pct = p.stats.percent ?? 0
              return (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Megaphone size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/projekty/${p.id}`} className="font-bold text-gray-900 block leading-tight hover:text-blue-700 truncate">
                          {p.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{categoryLabel(p.category)}</span>
                          {p.visible_on_web ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              <Eye size={10} /> web
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              <EyeOff size={10} /> interné
                            </span>
                          )}
                          {p.featured && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              <Star size={10} /> domov
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[p.status] ?? ''}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-gray-900">{formatEur(p.stats.collected_amount)}</span>
                        <span className="text-gray-400">{p.target_amount ? `z ${formatEur(p.target_amount)}` : 'bez cieľa'}</span>
                      </div>
                      {p.target_amount ? (
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                        <Users size={10} /> {p.stats.supporters_count} darcov
                        {p.target_amount ? <span className="ml-auto">{pct.toFixed(1)} %</span> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1 text-[11px] font-mono">
                      <div>
                        <span className="text-gray-400 font-sans font-bold mr-1">ŠS</span>
                        {p.specific_symbol ? <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">{p.specific_symbol}</span> : <span className="text-gray-300">–</span>}
                      </div>
                      <div>
                        <span className="text-gray-400 font-sans font-bold mr-1">VS</span>
                        {p.legacy_variable_symbol ? <span className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{p.legacy_variable_symbol}</span> : <span className="text-gray-300">–</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.visible_on_web && (
                        <Link href={`/vyzvy/${p.slug}`} target="_blank" title="Zobraziť na webe" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-emerald-100">
                          <ExternalLink size={16} />
                        </Link>
                      )}
                      <Link href={`/admin/projekty/${p.id}`} title="Upraviť" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100">
                        <Edit2 size={16} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        disabled={isPending}
                        title="Zmazať"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100 cursor-pointer disabled:opacity-40"
                      >
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
                  <Megaphone size={32} className="mx-auto text-gray-300" />
                  <p className="text-sm italic">Nenašli sa žiadne výzvy.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
