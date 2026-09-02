'use client'

import { useState } from 'react'
import {
  X,
  Save,
  AlertCircle,
  ImageIcon,
  Trash2,
  Loader2,
  FilePlus2,
  FileText,
} from 'lucide-react'
import { uploadDownloadFile, DownloadFile } from '@/app/admin/na-stiahnutie/actions'

export const CATEGORIES = [
  { value: 'document', label: 'Dokument' },
  { value: 'annual_report', label: 'Výročná správa' },
  { value: 'logo', label: 'Logotyp' },
] as const

export interface DownloadItem {
  id: string
  category: 'document' | 'annual_report' | 'logo'
  title: string
  description?: string | null
  year?: number | null
  image_url?: string | null
  files: DownloadFile[]
  sort_order: number
  visible: boolean
}

interface DownloadDialogProps {
  item?: DownloadItem | null
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

export default function DownloadDialog({ item, onSave, onClose }: DownloadDialogProps) {
  const [formData, setFormData] = useState({
    category: item?.category || 'document',
    title: item?.title || '',
    description: item?.description || '',
    year: item?.year?.toString() || '',
    sort_order: item?.sort_order?.toString() || '0',
    visible: item?.visible ?? true,
  })
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [files, setFiles] = useState<DownloadFile[]>(item?.files || [])
  const [imageLoading, setImageLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAnnualReport = formData.category === 'annual_report'
  const showImage = formData.category !== 'document'

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: val }))
  }

  // Nahranie ilustračného obrázka na B2
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', 'images')

    try {
      const res = await uploadDownloadFile(fd)
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

  // Nahranie súboru (PDF, DOCX…) na B2
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', 'files')

    try {
      const res = await uploadDownloadFile(fd)
      if (res.url) {
        setFiles((prev) => [...prev, { label: res.label || 'SÚBOR', url: res.url! }])
      } else {
        setError(res.error || 'Nahrávanie súboru zlyhalo')
      }
    } catch (err: any) {
      setError(err.message || 'Chyba pri nahrávaní súboru')
    } finally {
      setFileLoading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    if (files.length === 0) {
      setError('Pridajte aspoň jeden súbor na stiahnutie.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await onSave({
        ...(item?.id ? { id: item.id } : {}),
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description || null,
        year: formData.year ? parseInt(formData.year, 10) : null,
        image_url: imageUrl || null,
        files,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : 0,
        visible: formData.visible,
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
              {item ? 'Upraviť položku' : 'Nová položka na stiahnutie'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              Súbory sa ukladajú na Backblaze B2
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
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Kategória *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Názov *
              </label>
              <input
                autoFocus
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={isAnnualReport ? 'napr. Výročná správa 2025' : 'napr. Darovacia zmluva'}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Popis
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="Krátky popis položky..."
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm resize-none outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isAnnualReport && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                  Rok
                </label>
                <input
                  name="year"
                  type="number"
                  min="2019"
                  max="2100"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="2025"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                />
              </div>
            )}
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

          {showImage && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                {isAnnualReport ? 'Ilustračný obrázok (titulka správy)' : 'Náhľad loga'}
              </label>
              {imageUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 group aspect-video bg-gray-50">
                  <img src={imageUrl} alt="Náhľad" className="w-full h-full object-contain" />
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
          )}

          {/* Súbory na stiahnutie */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Súbory na stiahnutie *
            </label>
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={`${f.url}-${i}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl"
                >
                  <FileText size={16} className="text-blue-500 shrink-0" />
                  <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 shrink-0">
                    {f.label}
                  </span>
                  <span className="text-xs text-gray-500 truncate flex-1">{f.url}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="relative border-2 border-dashed border-gray-200 hover:border-blue-500/50 rounded-xl p-4 flex items-center justify-center gap-2 bg-gray-50/50 hover:bg-blue-50/10 transition-all cursor-pointer">
                {fileLoading ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <FilePlus2 className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  {fileLoading ? 'Nahrávam súbor...' : 'Pridať súbor (PDF, DOCX…)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.svg,.ai,.zip,.jpg,.jpeg,application/pdf"
                  onChange={handleFileUpload}
                  disabled={fileLoading}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
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
                Položka bude viditeľná na verejnej stránke Na stiahnutie
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
              disabled={loading || !formData.title.trim()}
              className={`flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} /> {item ? 'Uložiť zmeny' : 'Vytvoriť položku'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
