'use client'

import { useState } from 'react'
import { X, Save, AlertCircle, ImageIcon, Trash2, Loader2 } from 'lucide-react'
import { uploadSupportedProjectImage } from '@/app/admin/podporene-projekty/actions'

const SUPPORT_TYPES = [
  { value: 'grant', label: 'Grantová výzva' },
  { value: 'non_grant', label: 'Negrantová podpora' },
]

export interface SupportedProject {
  id: string
  year: number
  name: string
  organizer?: string | null
  realized_from?: string | null
  realized_to?: string | null
  description?: string | null
  amount?: number | null
  support_type: 'grant' | 'non_grant'
  sort_order: number
  visible: boolean
  image_url?: string | null
}

interface SupportedProjectDialogProps {
  project?: SupportedProject | null
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

export default function SupportedProjectDialog({
  project,
  onSave,
  onClose,
}: SupportedProjectDialogProps) {
  const [formData, setFormData] = useState({
    year: project?.year?.toString() || new Date().getFullYear().toString(),
    name: project?.name || '',
    organizer: project?.organizer || '',
    realized_from: project?.realized_from || '',
    realized_to: project?.realized_to || '',
    description: project?.description || '',
    amount: project?.amount?.toString() || '',
    support_type: project?.support_type || 'grant',
    sort_order: project?.sort_order?.toString() || '0',
    visible: project?.visible ?? true,
  })
  const [imageUrl, setImageUrl] = useState(project?.image_url || '')
  const [imageLoading, setImageLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nahranie ilustračného obrázka na Backblaze B2
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)
    if (project?.id) {
      fd.append('projectId', project.id)
    }

    try {
      const res = await uploadSupportedProjectImage(fd)
      if (res.url) {
        setImageUrl(res.url)
      } else {
        setError(res.error || 'Nahrávanie obrázka zlyhalo')
      }
    } catch (err: any) {
      setError(err.message || 'Chyba pri nahrávaní obrázka')
    } finally {
      setImageLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.year) return

    setLoading(true)
    setError(null)

    try {
      const result = await onSave({
        ...(project?.id ? { id: project.id } : {}),
        year: parseInt(formData.year, 10),
        name: formData.name.trim(),
        organizer: formData.organizer || null,
        realized_from: formData.realized_from || null,
        realized_to: formData.realized_to || null,
        description: formData.description || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        support_type: formData.support_type,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : 0,
        visible: formData.visible,
        image_url: imageUrl || null,
      })
      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Nastala chyba.')
      }
    } catch {
      setError('Nepodarilo sa spojiť so serverom.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {project ? 'Upraviť podporený projekt' : 'Nový podporený projekt'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              Verejná prezentácia na webe
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100"
          >
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

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Názov projektu *
              </label>
              <input
                autoFocus
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="napr. GODZONE tour 2025"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Rok *
              </label>
              <input
                required
                name="year"
                type="number"
                min="2019"
                max="2100"
                value={formData.year}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Organizátor projektu
            </label>
            <input
              name="organizer"
              value={formData.organizer}
              onChange={handleChange}
              placeholder="napr. Farnosť Žilina – mesto"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Realizácia od
              </label>
              <input
                name="realized_from"
                type="date"
                value={formData.realized_from}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Realizácia do
              </label>
              <input
                name="realized_to"
                type="date"
                value={formData.realized_to}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Ilustračný obrázok
            </label>
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 group aspect-video">
                <img src={imageUrl} alt="Náhľad" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-3 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors shadow-lg cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-gray-200 hover:border-blue-500/50 rounded-2xl aspect-video flex flex-col items-center justify-center gap-2 bg-gray-50/50 hover:bg-blue-50/10 transition-all cursor-pointer">
                {imageLoading ? (
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  {imageLoading ? 'Nahrávam obrázok...' : 'Kliknutím nahrajte B2 obrázok'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageLoading}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Popis
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Popis projektu, ako sa zobrazí na webe..."
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm resize-none outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Podporená suma (€)
              </label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Typ podpory
              </label>
              <select
                name="support_type"
                value={formData.support_type}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              >
                {SUPPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Poradie
              </label>
              <input
                name="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-blue-200 transition-all">
            <input
              type="checkbox"
              name="visible"
              checked={formData.visible}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
            />
            <div>
              <p className="text-sm font-bold text-gray-900">Zobraziť na webe</p>
              <p className="text-[10px] text-gray-400">
                Projekt bude viditeľný na verejnej stránke Podporené projekty
              </p>
            </div>
          </label>

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
                <>
                  <Save size={18} /> {project ? 'Uložiť zmeny' : 'Vytvoriť projekt'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
