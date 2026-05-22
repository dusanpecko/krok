'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Info, Calendar, Download, Database } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getImportHistory } from './actions'

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    imported?: number
    skipped?: number
    matched?: number
    errors?: string[]
  } | null>(null)

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
      setFile(e.dataTransfer.files[0])
      setResult(null)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)

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
           // Duplicate import
           setResult({
             success: false,
             message: data.message || 'Tento výpis už bol importovaný.',
             errors: [data.details ? `Súbor bol už nahratý: ${data.details.original_file || ''}` : 'Ide o duplikát'],
           })
        } else {
           setResult({
             success: false,
             errors: data.error ? [data.error] : data.errors || ['Neznáma chyba na serveri.'],
           })
        }
      } else {
        setResult({
          success: true,
          message: data.message,
          imported: data.imported,
          skipped: data.skipped,
          matched: data.matched,
          errors: data.errors > 0 ? [`Pri importe nastalo ${data.errors} chýb u čiastkových transakcií`] : [],
        })
        fetchHistory() // Refresh the history list after a successful import
      }
    } catch (error) {
      console.error('Error importing:', error)
      setResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Nastala neočakávaná chyba'],
      })
    } finally {
      setImporting(false)
    }
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
              <Upload size={24} className="text-blue-500" /> Vložiť súbor
            </h2>

            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center w-full h-72 
                border-2 border-dashed rounded-2xl cursor-pointer
                transition-all duration-200
                ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
                    : file
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              {file ? (
                <div className="flex flex-col items-center text-center px-4">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <FileText size={32} />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-1">{file.name}</p>
                  <p className="text-sm font-mono text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-blue-600 font-bold mt-6">Kliknite alebo presuňte iný súbor</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center px-4">
                  <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                    <Upload size={32} />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-1">
                    Pretiahnite sem .xml súbor
                  </p>
                  <p className="text-sm text-gray-500">alebo kliknite pre výber z počítača</p>
                </div>
              )}
              <input
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Import Button */}
            {file && (
              <div className="mt-8">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                >
                  {importing ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                      Spracovávam údaje...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={24} />
                      Spustiť import výpisu
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Results Block */}
          {result && (
            <div
              className={`rounded-3xl p-8 border animate-in slide-in-from-bottom-4 duration-500 ${
                result.success
                  ? 'bg-gradient-to-br from-green-50 to-white border-green-100 shadow-lg shadow-green-900/5'
                  : 'bg-gradient-to-br from-red-50 to-white border-red-100 shadow-lg shadow-red-900/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${
                  result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {result.success ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className={`text-xl font-black ${result.success ? 'text-green-950' : 'text-red-950'}`}>
                      {result.success ? 'Výpis bol spracovaný' : 'Import zlyhal'}
                    </h3>
                    {result.message && <p className="text-gray-600 mt-1">{result.message}</p>}
                  </div>

                  {result.success && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                       <div className="bg-white p-4 rounded-xl border border-green-100/50 shadow-sm flex flex-col items-center justify-center">
                          <span className="text-green-600/60 text-[10px] font-black uppercase tracking-wider">Nové transakcie</span>
                          <span className="text-3xl font-black text-green-700">{result.imported || 0}</span>
                       </div>
                       <div className="bg-white p-4 rounded-xl border border-green-100/50 shadow-sm flex flex-col items-center justify-center">
                          <span className="text-blue-600/60 text-[10px] font-black uppercase tracking-wider">Z toho spárované</span>
                          <span className="text-3xl font-black text-blue-700">{result.matched || 0}</span>
                       </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-2">Hlásenia a chyby:</p>
                      <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                        {result.errors.map((error: string, idx: number) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.success && (
                    <button
                      onClick={() => router.push('/admin/banka')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
                    >
                      Prejsť na Banku <ArrowLeft size={16} className="rotate-180" />
                    </button>
                  )}
                </div>
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
