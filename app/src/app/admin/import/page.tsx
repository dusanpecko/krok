'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Info, Calendar, Download, Database } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getImportHistory } from './actions'

export default function ImportPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [currentImportIndex, setCurrentImportIndex] = useState<number | null>(null)
  
  const [fileResults, setFileResults] = useState<{
    filename: string
    success: boolean
    message?: string
    imported?: number
    matched?: number
    skipped?: number
    error?: string
  }[]>([])

  const [history, setHistory] = useState<any[]>([])

  const fetchHistory = async () => {
    const data = await getImportHistory()
    if (data) setHistory(data)
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const xmlFiles = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.xml'))
      if (xmlFiles.length > 0) {
        setFiles(prev => [...prev, ...xmlFiles])
        setFileResults([])
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const xmlFiles = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.xml'))
      if (xmlFiles.length > 0) {
        setFiles(prev => [...prev, ...xmlFiles])
        setFileResults([])
      }
    }
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleImport = async () => {
    if (files.length === 0) return

    setImporting(true)
    setFileResults([])

    const results = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setCurrentImportIndex(i)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/admin/import-xml', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409) {
            results.push({
              filename: file.name,
              success: false,
              error: data.message || 'Duplikátny import (súbor už bol nahratý).'
            })
          } else {
            results.push({
              filename: file.name,
              success: false,
              error: data.error || 'Neznáma chyba na serveri.'
            })
          }
        } else {
          results.push({
            filename: file.name,
            success: true,
            message: data.message,
            imported: data.imported || 0,
            matched: data.matched || 0,
            skipped: data.skipped || 0
          })
        }
      } catch (error) {
        console.error(`Error importing ${file.name}:`, error)
        results.push({
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Nastala neočakávaná chyba.'
        })
      }
    }

    setFileResults(results)
    setCurrentImportIndex(null)
    setFiles([]) // Clear selected files after import
    setImporting(false)
    fetchHistory() // Refresh the history list
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Import výpisov</h1>
          <p className="text-gray-500 mt-1">Nahrajte bankový výpis (Fio Banka) vo formáte XML</p>
        </div>
        <Link 
          href="/admin/banka"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95"
        >
          <ArrowLeft size={18} /> Zobraziť platby
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Result */}
        <div className="md:col-span-2 space-y-6">
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Upload size={24} className="text-blue-500" /> Vložiť súbory
            </h2>

            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center w-full min-h-72 py-6
                border-2 border-dashed rounded-2xl cursor-pointer
                transition-all duration-200
                ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
                    : files.length > 0
                    ? 'border-blue-500 bg-blue-50/10'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              {files.length > 0 ? (
                <div className="w-full max-w-xl flex flex-col gap-3 px-6" onClick={(e) => e.stopPropagation()}>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-left mb-1">Vybraté súbory ({files.length}):</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText size={18} className="text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-bold text-gray-900 truncate" title={file.name}>{file.name}</span>
                          <span className="text-xs text-gray-400 font-mono flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 font-bold text-center mt-4">Presuňte sem ďalšie súbory alebo kliknite pre pridanie</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center px-4">
                  <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                    <Upload size={32} />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-1">
                    Pretiahnite sem .xml súbory
                  </p>
                  <p className="text-sm text-gray-500">alebo kliknite pre výber z počítača</p>
                </div>
              )}
              <input
                type="file"
                accept=".xml"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Import Button */}
            {files.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                >
                  {importing ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                      Spracovávam {currentImportIndex !== null ? `${currentImportIndex + 1}/${files.length}` : ''} ({files[currentImportIndex || 0]?.name})...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={24} />
                      Spustiť import ({files.length} {files.length === 1 ? 'súbor' : files.length < 5 ? 'súbory' : 'súborov'})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Results Block */}
          {fileResults.length > 0 && (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-blue-900/5 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-xl font-black text-gray-900">Spracovanie hromadného importu</h3>
                <p className="text-sm text-gray-500 mt-1">Celkovo spracovaných: <span className="font-bold text-gray-900">{fileResults.length} súborov</span></p>
              </div>

              <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-1">
                {fileResults.map((res, idx) => (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 truncate">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        res.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {res.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-gray-900 truncate" title={res.filename}>{res.filename}</p>
                        {res.success ? (
                          <p className="text-xs text-green-600 font-medium">
                            Úspešne naimportované: <span className="font-bold">{res.imported}</span> platieb (spárované: <span className="font-bold">{res.matched}</span>{res.skipped ? <>, preskočené: <span className="font-bold">{res.skipped}</span></> : null})
                          </p>
                        ) : (
                          <p className="text-xs text-red-600 font-medium">{res.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => router.push('/admin/banka')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
                >
                  Prejsť na Banku <ArrowLeft size={16} className="rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Info */}
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6">
            <h3 className="font-black text-blue-900 mb-4 flex items-center gap-2 text-lg">
              <Info size={20} className="text-blue-600" />
              Podpora formátu
            </h3>
            
            <p className="text-sm text-blue-800/80 mb-6 leading-relaxed">
              Tento systém je nastavený na parsovanie formátu <strong>camt.053 (SEPA XML)</strong> z Fio banky.
            </p>
            
            <div className="space-y-4">
               <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100/50">
                  <h4 className="font-bold text-blue-900 text-sm mb-1">Ochrana pred duplicitou</h4>
                  <p className="text-xs text-blue-800/70">Zabezpečená kontrolou "Message ID" samotného výpisu. Už spracovaný dokument sa neimportuje znova.</p>
               </div>
               
               <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100/50">
                  <h4 className="font-bold text-blue-900 text-sm mb-1">Automatické párovanie</h4>
                  <p className="text-xs text-blue-800/70">Dary sa ihneď párujú s donátormi na základe vzťahu Variabilný Symbol = ID darcu. Projekty sa priradia podľa Špecifického symbolu.</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
           <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
             <Calendar size={20} className="text-gray-400" />
             História importov
           </h3>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-8 py-4">Dátum importu</th>
              <th className="px-6 py-4">Zdrojový súbor</th>
              <th className="px-6 py-4 text-center">Počet platieb</th>
              <th className="px-6 py-4">Účet (IBAN)</th>
              <th className="px-8 py-4 text-right">Miesto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map(batch => (
              <tr key={batch.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-8 py-5 text-sm font-medium text-gray-900">
                  {new Date(batch.imported_at).toLocaleString('sk-SK')}
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600 font-mono" title={batch.filename}>
                        {batch.filename?.length > 40 ? batch.filename.substring(0, 40) + '...' : batch.filename}
                      </span>
                   </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold font-mono">
                    {batch.total_entries || 0}
                  </span>
                </td>
                <td className="px-6 py-5 text-xs text-gray-500 font-mono">
                  {batch.iban || '-'}
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-wider">
                     <Database size={12} /> Supabase Bucket
                  </span>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-gray-400">
                  <p className="text-sm italic">Ešte neboli zrealizované žiadne bankové importy.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  )
}
