'use client'

import { useState } from 'react'
import { Plus, X, Save, AlertCircle } from 'lucide-react'

interface Deanery {
  id: string
  name: string
}

interface DeaneryDialogProps {
  deanery?: Deanery | null
  onSave: (data: { id?: string, name: string }) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

export default function DeaneryDialog({ deanery, onSave, onClose }: DeaneryDialogProps) {
  const [name, setName] = useState(deanery?.name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await onSave({ id: deanery?.id, name: name.trim() })
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
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {deanery ? 'Upraviť dekanát' : 'Nový dekanát'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Pomocná databáza</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100 shadow-sm">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start gap-3 border border-red-100 italic text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Názov dekanátu</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="napr. Žilina"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-base font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none"
            />
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
              disabled={loading || !name.trim()}
              className={`flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {deanery ? 'Uložiť zmeny' : 'Vytvoriť dekanát'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
