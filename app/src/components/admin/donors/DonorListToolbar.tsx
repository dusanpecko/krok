'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown, Rows3 } from 'lucide-react'
import { exportDonors } from '@/app/admin/darcovia/actions'

interface Props {
  shown: number
  total: number
  pageSize: number
  pageSizes: readonly number[]
}

/** Lišta nad tabuľkou darcov: počet výsledkov, veľkosť strany a export (CSV / XLSX) podľa aktuálnych filtrov a radenia. */
export default function DonorListToolbar({ shown, total, pageSize, pageSizes }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changePageSize = (size: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(size))
    params.delete('page')
    startTransition(() => router.push(`/admin/darcovia?${params.toString()}`))
  }

  const runExport = async (format: 'csv' | 'xlsx') => {
    setMenuOpen(false)
    setExporting(format)
    setError(null)
    try {
      const raw: Record<string, string> = {}
      searchParams.forEach((v, k) => {
        raw[k] = v
      })
      const res = await exportDonors(raw, format)
      if (!res.success) {
        setError(res.error)
        return
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: res.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Export zlyhal. Skúste to znova.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
      <p className="text-sm text-gray-500 font-medium font-mono">
        Zobrazené: <span className="text-gray-900">{shown}</span> z <span className="text-gray-900">{total}</span> výsledkov
        {error && <span className="block sm:inline sm:ml-3 text-red-600 font-sans font-bold text-xs">{error}</span>}
      </p>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <Rows3 size={14} className="text-gray-400" />
          <span className="hidden sm:inline">Na stranu</span>
          <select
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
            disabled={isPending}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          >
            {pageSizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            disabled={exporting !== null || total === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Pripravujem…' : 'Export'}
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <p className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Exportuje sa {total} darcov podľa filtrov a radenia
                </p>
                <button type="button" onClick={() => runExport('xlsx')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer">
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  <span className="font-bold">Excel (.xlsx)</span>
                </button>
                <button type="button" onClick={() => runExport('csv')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer">
                  <FileText size={16} className="text-blue-600" />
                  <span className="font-bold">CSV (.csv)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
