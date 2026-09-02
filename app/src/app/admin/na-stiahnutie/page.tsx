'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Home, ChevronRight, Download, Edit2, Trash2, Eye, EyeOff, FileText } from 'lucide-react'
import Link from 'next/link'
import { getDownloads, upsertDownload, deleteDownload } from './actions'
import DownloadDialog, { DownloadItem, CATEGORIES } from '@/components/admin/downloads/DownloadDialog'

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
)

export default function DownloadsAdminPage() {
  const [items, setItems] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DownloadItem | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const data = await getDownloads()
    setItems(data as DownloadItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleDelete = async (id: string) => {
    if (confirm('Naozaj chcete zmazať túto položku? Súbory na B2 budú tiež odstránené.')) {
      const result = await deleteDownload(id)
      if (result.success) {
        fetchItems()
      } else {
        alert(result.error)
      }
    }
  }

  const handleSave = async (data: any) => {
    const result = await upsertDownload(data)
    if (result.success) {
      fetchItems()
    }
    return result
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link
          href="/admin"
          className="hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <div className="flex items-center gap-1">
          <Download size={12} /> <span className="text-gray-900">Na stiahnutie</span>
        </div>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Na stiahnutie</h1>
          <p className="text-gray-500 mt-1">
            Správa dokumentov, výročných správ a logotypov na verejnej stránke
          </p>
        </div>

        <button
          onClick={() => {
            setEditingItem(null)
            setIsDialogOpen(true)
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Pridať položku
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Kategória</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Názov</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Rok</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Súbory</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Poradie</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Web</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-10 h-10 rounded-xl object-contain bg-gray-50 shrink-0 shadow-sm border border-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <FileText size={20} />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-gray-900 block leading-tight">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium line-clamp-1">
                          {item.description || ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-gray-900">{item.year || '–'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-1">
                      {(item.files || []).map((f, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5"
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold font-mono">
                      {item.sort_order}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {item.visible ? (
                      <Eye size={16} className="inline text-green-500" />
                    ) : (
                      <EyeOff size={16} className="inline text-gray-300" />
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setIsDialogOpen(true)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center text-gray-400 space-y-3">
                    <Download size={32} className="mx-auto text-gray-300" />
                    <p className="text-sm italic">Zatiaľ žiadne položky na stiahnutie.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen && (
        <DownloadDialog
          item={editingItem}
          onSave={handleSave}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  )
}
