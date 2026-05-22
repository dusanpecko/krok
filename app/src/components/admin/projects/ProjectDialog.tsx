'use client'

import { useState } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'

const CATEGORIES = [
  { value: 'charity', label: 'Charita' },
  { value: 'education', label: 'Vzdelávanie' },
  { value: 'parish', label: 'Farnosť' },
  { value: 'evangelization', label: 'Evanjelizácia' },
  { value: 'youth', label: 'Mládež' },
  { value: 'liturgy', label: 'Liturgia' },
  { value: 'other', label: 'Iné' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktívny' },
  { value: 'draft', label: 'Návrh' },
  { value: 'completed', label: 'Ukončený' },
]

interface Project {
  id: string
  name: string
  description?: string | null
  category?: string
  status?: string
  target_amount?: number | null
  start_date?: string | null
  end_date?: string | null
  specific_symbol?: string | null
  visible_on_web?: boolean
}

interface ProjectDialogProps {
  project?: Project | null
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

export default function ProjectDialog({ project, onSave, onClose }: ProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    category: project?.category || 'other',
    status: project?.status || 'active',
    target_amount: project?.target_amount?.toString() || '',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    specific_symbol: project?.specific_symbol || '',
    visible_on_web: project?.visible_on_web || false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await onSave({
        ...(project?.id ? { id: project.id } : {}),
        name: formData.name.trim(),
        description: formData.description || null,
        category: formData.category,
        status: formData.status,
        target_amount: formData.target_amount ? parseFloat(formData.target_amount) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        specific_symbol: formData.specific_symbol || null,
        visible_on_web: formData.visible_on_web,
      })
      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Nastala chyba.')
      }
    } catch (err) {
      setError('Nepodarilo sa spojiť so serverom.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {project ? 'Upraviť projekt' : 'Nový projekt'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Pomocná databáza</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100">
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
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Názov projektu *</label>
            <input
              autoFocus
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="napr. Lectio divina"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Popis</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Krátky popis projektu..."
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm resize-none outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Kategória</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Stav</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Špecifický symbol (pre párovanie platieb)</label>
            <input
              name="specific_symbol"
              value={formData.specific_symbol}
              onChange={handleChange}
              placeholder="napr. 392"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-mono outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
            />
            <p className="text-[10px] text-gray-400 px-1">Tento symbol sa používa pri automatickom párovaní bankových výpisov.</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Cieľová suma (€)</label>
              <input
                name="target_amount"
                type="number"
                value={formData.target_amount}
                onChange={handleChange}
                placeholder="0"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Začiatok</label>
              <input
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Koniec</label>
              <input
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-blue-200 transition-all">
            <input
              type="checkbox"
              name="visible_on_web"
              checked={formData.visible_on_web}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
            />
            <div>
              <p className="text-sm font-bold text-gray-900">Zobraziť na webe</p>
              <p className="text-[10px] text-gray-400">Projekt bude viditeľný pre verejnosť na krok.dcza.sk</p>
            </div>
          </label>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all">
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className={`flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={18} /> {project ? 'Uložiť zmeny' : 'Vytvoriť projekt'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
