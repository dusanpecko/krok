'use client'

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'

interface Deanery {
  id: string
  name: string
}

interface Parish {
  id: string
  name: string
  deanery_id?: string | null
  city?: string | null
  postal_code?: string | null
}

interface ParishDialogProps {
  parish?: Parish | null
  deaneries: Deanery[]
  onSave: (data: Omit<Parish, 'id'> & { id?: string }) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

export default function ParishDialog({ parish, deaneries, onSave, onClose }: ParishDialogProps) {
  const [formData, setFormData] = useState({
    name: parish?.name || '',
    deanery_id: parish?.deanery_id || '',
    city: parish?.city || '',
    postal_code: parish?.postal_code || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await onSave({
        ...(parish?.id ? { id: parish.id } : {}),
        name: formData.name.trim(),
        deanery_id: formData.deanery_id || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
      })
      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Nastala chyba pri ukladaní.')
      }
    } catch (err) {
      setError('Nepodarilo sa spojiť so serverom.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {parish ? 'Upraviť farnosť' : 'Nová farnosť'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Pomocná databáza</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100 shadow-sm">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start gap-3 border border-red-100 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Názov farnosti *</label>
            <input
              autoFocus
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="napr. Farnosť Žilina-Mesto"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Dekanát</label>
            <select
              name="deanery_id"
              value={formData.deanery_id}
              onChange={handleChange}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
            >
              <option value="">— Bez dekanátu —</option>
              {deaneries.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Mesto</label>
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="napr. Žilina"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">PSČ</label>
              <input
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="010 01"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className={`flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={18} /> {parish ? 'Uložiť zmeny' : 'Vytvoriť farnosť'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
