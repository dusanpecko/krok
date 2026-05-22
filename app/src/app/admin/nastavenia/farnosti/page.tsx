'use client'

import { useState, useEffect } from 'react'
import { Plus, Home, ChevronRight, Settings } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { upsertParish, deleteParish } from './actions'
import ParishTable from '@/components/admin/parishes/ParishTable'
import ParishDialog from '@/components/admin/parishes/ParishDialog'

export default function ParishesPage() {
  const [parishes, setParishes] = useState<any[]>([])
  const [deaneries, setDeaneries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingParish, setEditingParish] = useState<any | null>(null)

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)

    const [parishesRes, deaneriesRes] = await Promise.all([
      supabase
        .from('parishes')
        .select(`
          *,
          deaneries ( name ),
          donors (id)
        `)
        .order('name'),
      supabase
        .from('deaneries')
        .select('id, name')
        .order('name')
    ])

    if (!parishesRes.error) {
      const formatted = parishesRes.data.map(p => ({
        ...p,
        deanery: p.deaneries,
        donors_count: p.donors?.length || 0
      }))
      setParishes(formatted)
    }

    if (!deaneriesRes.error) {
      setDeaneries(deaneriesRes.data)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleEdit = (parish: any) => {
    setEditingParish(parish)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Naozaj chcete zmazať túto farnosť?')) {
      const result = await deleteParish(id)
      if (result.success) {
        fetchData()
      } else {
        alert(result.error)
      }
    }
  }

  const handleSave = async (data: any) => {
    const result = await upsertParish(data)
    if (result.success) {
      fetchData()
    }
    return result
  }

  const totalDonors = parishes.reduce((sum, p) => sum + (p.donors_count || 0), 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link href="/admin" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <div className="flex items-center gap-1">
          <Settings size={12} /> Nastavenia
        </div>
        <ChevronRight size={12} />
        <span className="text-gray-900">Farnosti</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Farnosti</h1>
          <p className="text-gray-500 mt-1">Správa farností Žilinskej diecézy</p>
        </div>

        <button
          onClick={() => { setEditingParish(null); setIsDialogOpen(true) }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Pridať farnosť
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-blue-600/20">
          <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Celkom farností</p>
          <p className="text-3xl font-black mt-1">{parishes.length}</p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Dekanátov</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{deaneries.length}</p>
        </div>
        <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg hidden sm:block">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Darcov celkom</p>
          <p className="text-3xl font-black mt-1">{totalDonors}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-400 animate-pulse">Načítavam farnosti...</p>
        </div>
      ) : (
        <ParishTable
          parishes={parishes}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isDialogOpen && (
        <ParishDialog
          parish={editingParish}
          deaneries={deaneries}
          onSave={handleSave}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  )
}
