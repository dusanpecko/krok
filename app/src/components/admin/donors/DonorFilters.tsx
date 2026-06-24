'use client'

import { Search, SlidersHorizontal, UserPlus, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DonorFiltersProps {
  parishes: { id: string, name: string }[]
  projects: { id: string, name: string }[]
}

export default function DonorFilters({ parishes, projects }: DonorFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [parishId, setParishId] = useState(searchParams.get('parish') || 'all')
  const [projectId, setProjectId] = useState(searchParams.get('project') || 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '')
  const [selectedFilter, setSelectedFilter] = useState(searchParams.get('selected') || 'all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const loadSelected = () => {
      const saved = localStorage.getItem('krok_selected_donors')
      if (saved) {
        try {
          setSelectedIds(JSON.parse(saved))
        } catch (e) {
          console.error(e)
        }
      } else {
        setSelectedIds([])
      }
    }
    
    loadSelected()
    window.addEventListener('krok_selected_donors_changed', loadSelected)
    return () => window.removeEventListener('krok_selected_donors_changed', loadSelected)
  }, [])

  const hasActiveFilters = 
    search !== '' || 
    status !== 'all' || 
    parishId !== 'all' || 
    projectId !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    selectedFilter !== 'all'

  // Sync state with URL manually if needed, but here we'll trigger on submit or change
  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (status !== 'all') params.set('status', status)
    if (parishId !== 'all') params.set('parish', parishId)
    if (projectId !== 'all') params.set('project', projectId)
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (selectedFilter !== 'all') {
      params.set('selected', selectedFilter)
      params.set('ids', selectedIds.join(','))
    }

    // Keep sort params if present
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder')
    if (sortBy) params.set('sortBy', sortBy)
    if (sortOrder) params.set('sortOrder', sortOrder)
    
    router.push(`/admin/darcovia?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setParishId('all')
    setProjectId('all')
    setDateFrom('')
    setDateTo('')
    setSelectedFilter('all')
    router.push('/admin/darcovia')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Search Input */}
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Hľadať darcu podľa mena, VS alebo e-mailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filtre
            {hasActiveFilters && (
              <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px]">!</span>
            )}
          </button>

          <button 
            onClick={applyFilters}
            className="hidden sm:flex px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all"
          >
            Hľadať
          </button>

          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold shadow-sm hover:bg-red-100 hover:border-red-200 transition-all"
              title="Všetko vyčistiť"
            >
              <X size={16} />
              Vyčistiť
            </button>
          )}

          <Link href="/admin/darcovia/novy" className="flex flex-1 sm:flex-initial items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all">
            <UserPlus size={18} />
            <span className="whitespace-nowrap">Pridať darcu</span>
          </Link>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Stav darcu</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Všetci</option>
              <option value="active">Aktívni</option>
              <option value="inactive">Neaktívni</option>
              <option value="suspended">Pozastavení</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Projekt / Fond</label>
            <select 
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Všetky projekty</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Farnosť</label>
            <select 
              value={parishId}
              onChange={(e) => setParishId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Všetky farnosti</option>
              {parishes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Dary od</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Dary do</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Označení (výber)</label>
            <select 
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="all">Všetci darcovia</option>
              <option value="marked">Iba označení ({selectedIds.length})</option>
              <option value="unmarked">Iba neoznačení</option>
            </select>
          </div>

          <div className="flex items-end gap-2 mt-4 sm:mt-0 sm:col-span-3 justify-end">
            <button 
              onClick={applyFilters}
              className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
            >
              Použiť filtre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
