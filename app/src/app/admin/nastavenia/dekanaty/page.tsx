'use client'

import { useState, useEffect } from 'react'
import { Plus, Home, ChevronRight, Map, Settings } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { upsertDeanery, deleteDeanery } from './actions'
import DeaneryTable from '@/components/admin/deaneries/DeaneryTable'
import DeaneryDialog from '@/components/admin/deaneries/DeaneryDialog'

export default function DeaneriesPage() {
  const [deaneries, setDeaneries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDeanery, setEditingDeanery] = useState<any | null>(null)

  const supabase = createClient()

  async function fetchDeaneries() {
    setLoading(true)
    // Fetch deaneries with parishes count
    const { data: deaneriesData, error } = await supabase
      .from('deaneries')
      .select(`
        *,
        parishes (id)
      `)
      .order('name')

    if (error) {
      console.error('Error fetching deaneries:', error)
    } else {
      const formatted = deaneriesData.map(d => ({
        ...d,
        parishes_count: d.parishes?.length || 0
      }))
      setDeaneries(formatted)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDeaneries()
  }, [])

  const handleEdit = (deanery: any) => {
    setEditingDeanery(deanery)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Naozaj chcete zmazať tento dekanát?')) {
      const result = await deleteDeanery(id)
      if (result.success) {
        fetchDeaneries()
      } else {
        alert(result.error)
      }
    }
  }

  const handleSave = async (data: { id?: string; name: string }) => {
    const result = await upsertDeanery(data)
    if (result.success) {
      fetchDeaneries()
    }
    return result
  }

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
        <span className="text-gray-900">Dekanáty</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dekanáty</h1>
          <p className="text-gray-500 mt-1">Správa cirkevnej územnej správy Žilinskej diecézy</p>
        </div>

        <button
          onClick={() => {
            setEditingDeanery(null)
            setIsDialogOpen(true)
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Pridať dekanát
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 flex flex-col items-center justify-center space-y-4">
           <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
           <p className="text-sm font-bold text-gray-400 animate-pulse">Načítavam dekanáty...</p>
        </div>
      ) : (
        <DeaneryTable 
          deaneries={deaneries} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
        />
      )}

      {isDialogOpen && (
        <DeaneryDialog 
          deanery={editingDeanery}
          onSave={handleSave}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  )
}
