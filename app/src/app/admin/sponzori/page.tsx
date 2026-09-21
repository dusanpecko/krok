'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Home, ChevronRight, Handshake } from 'lucide-react'
import { getSponsors, upsertSponsor, deleteSponsor } from './actions'
import type { Sponsor, SponsorPayload } from '@/lib/sponsors/types'
import SponsorTable from '@/components/admin/sponsors/SponsorTable'
import SponsorDialog from '@/components/admin/sponsors/SponsorDialog'

export default function SponsorsAdminPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Sponsor | null>(null)

  // Zmena kľúča vynúti nové načítanie (po uložení / zmazaní)
  const [reloadKey, setReloadKey] = useState(0)
  const fetchSponsors = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    getSponsors().then((data) => {
      if (cancelled) return
      setSponsors(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const handleEdit = (s: Sponsor) => {
    setEditing(s)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Naozaj chcete zmazať tohto sponzora? Zmaže sa aj jeho logo.')) return
    const res = await deleteSponsor(id)
    if (res.success) fetchSponsors()
    else alert(res.error)
  }

  const handleSave = async (payload: SponsorPayload) => {
    const res = await upsertSponsor(payload)
    if (res.success) fetchSponsors()
    return res
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link href="/admin" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <div className="flex items-center gap-1">
          <Handshake size={12} /> <span className="text-gray-900">Sponzori</span>
        </div>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sponzori a partneri</h1>
          <p className="text-gray-500 mt-1">Logá v páse „Podporili nás“ na domovskej stránke. Logo sa dá pri nahrávaní orezať.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setIsDialogOpen(true)
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={18} /> Pridať sponzora
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <SponsorTable sponsors={sponsors} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {isDialogOpen && <SponsorDialog sponsor={editing} onSave={handleSave} onClose={() => setIsDialogOpen(false)} />}
    </div>
  )
}
