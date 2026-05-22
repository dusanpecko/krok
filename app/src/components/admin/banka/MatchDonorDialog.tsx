'use client'

import { useState, useEffect } from 'react'
import { X, Search, CheckCircle2, AlertCircle, Building2, User } from 'lucide-react'
import { searchDonors, matchTransaction } from '@/app/admin/banka/actions'

interface MatchDonorDialogProps {
  transaction: any
  projects: any[]
  onClose: () => void
  onSuccess: () => void
}

export default function MatchDonorDialog({ transaction, projects, onClose, onSuccess }: MatchDonorDialogProps) {
  const [query, setQuery] = useState(transaction.counterparty_name || '')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState<any | null>(null)
  
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Automaticky hľadať ak je k dispozícii meno
  useEffect(() => {
    if (query.trim().length > 2) {
      handleSearch(query)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Predvoliť projekt ak transakcia má špecifický symbol
  useEffect(() => {
    if (transaction.specific_symbol && projects.length > 0) {
      const p = projects.find(proj => proj.specific_symbol === transaction.specific_symbol)
      if (p) setSelectedProject(p.id)
    }
  }, [transaction.specific_symbol, projects])

  const handleSearch = async (val: string) => {
    setQuery(val)
    if (val.trim().length < 2) {
      setResults([])
      return
    }
    
    setIsSearching(true)
    const donors = await searchDonors(val)
    setResults(donors)
    setIsSearching(false)
  }

  const handleMatch = async () => {
    if (!selectedDonor) return

    if (transaction.matched) {
      if (!window.confirm('Táto platba už je spárovaná. Naozaj ju chcete nanovo spárovať s novým darcom?')) {
        return
      }
    }

    setIsSaving(true)
    setError(null)

    const res = await matchTransaction(
      transaction.id, 
      selectedDonor.id, 
      selectedProject === '' ? null : selectedProject
    )

    if (res.success) {
      onSuccess()
    } else {
      setError(res.error || 'Nastala chyba pri párovaní.')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900">Manuálne spárovanie platby</h2>
            <p className="text-sm text-gray-500 mt-1">Priradenie prijatej transakcie k donátorovi</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Transakcia Summary */}
        <div className="px-8 py-4 bg-blue-50/30 border-b border-blue-50 grid grid-cols-2 gap-4">
           <div>
             <span className="text-[10px] uppercase font-black tracking-wider text-blue-400">Prijatá Suma</span>
             <p className="font-mono text-xl font-black text-blue-700">{transaction.amount} {transaction.currency}</p>
           </div>
           <div>
             <span className="text-[10px] uppercase font-black tracking-wider text-blue-400">Protiúčet / Meno</span>
             <p className="text-sm font-bold text-gray-900 truncate">{transaction.counterparty_name || transaction.counterparty_iban}</p>
             <p className="text-xs text-gray-500 truncate">{transaction.remittance_info}</p>
           </div>
        </div>

        {/* Telo / Hľadanie */}
        <div className="p-8 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div className="space-y-6">
             {/* Rýchla voľba: Anonymný darca */}
             <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                <div>
                   <h4 className="text-sm font-black text-orange-900 leading-none">Anonymný dar (DARY Donátor)</h4>
                   <p className="text-[10px] text-orange-700 mt-1 uppercase font-bold tracking-wider">VS: 11770000</p>
                </div>
                <button
                   onClick={() => setSelectedDonor({
                      id: '7aa76574-af94-45c8-b4ce-40b9995c8906',
                      first_name: 'DARY',
                      last_name: 'Donátor',
                      variable_symbol: '11770000'
                   })}
                   className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-sm transition-all"
                >
                   Použiť tento profil
                </button>
             </div>

             {/* Krok 1: Výber Darcu */}
             <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Alebo vyhľadať iného darcu (Meno, VS...)</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Začnite písať pre vyhľadanie..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Výsledky hľadania */}
                {results.length > 0 && !selectedDonor && (
                  <div className="mt-3 border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                    {results.map(donor => (
                      <button
                        key={donor.id}
                        onClick={() => setSelectedDonor(donor)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                              <User size={14} />
                           </div>
                           <div>
                              <div className="text-sm font-bold text-gray-900 group-hover:text-blue-900">
                                {`${donor.first_name} ${donor.last_name}`}
                              </div>
                              <div className="text-xs text-gray-500 font-mono flex gap-2 mt-0.5">
                                {donor.variable_symbol && <span>VS: {donor.variable_symbol}</span>}
                                {donor.city && <span>• {donor.city}</span>}
                              </div>
                           </div>
                        </div>
                        <div className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 px-3 py-1 bg-blue-100 rounded-lg transition-all">Vybrať</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {query.length > 2 && results.length === 0 && !isSearching && !selectedDonor && (
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-500 text-center">
                    Nebol nájdený žiadny darca. 
                  </div>
                )}

                {/* Vybraný darca */}
                {selectedDonor && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-green-900">
                           {`${selectedDonor.first_name} ${selectedDonor.last_name}`}
                        </p>
                        <p className="text-xs text-green-700 font-mono">VS: {selectedDonor.variable_symbol || 'Neurčené'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedDonor(null)}
                      className="px-3 py-1.5 bg-white text-gray-500 text-xs font-bold rounded-lg border border-green-200 hover:bg-gray-50"
                    >
                      Zmeniť
                    </button>
                  </div>
                )}
             </div>

             {/* Krok 2: Alokácia na projekt */}
             <div className={`transition-opacity duration-300 ${!selectedDonor ? 'opacity-30 pointer-events-none' : ''}`}>
                <label className="block text-sm font-bold text-gray-900 mb-2">2. Určenie na konkrétny projekt (nepovinné)</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Bez označenia projektu (Bežný dar) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.specific_symbol ? `(SS: ${p.specific_symbol})` : ''}
                    </option>
                  ))}
                </select>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Zrušiť
          </button>
          <button
            onClick={handleMatch}
            disabled={!selectedDonor || isSaving}
            className="px-6 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            Spárovať a uložiť dar
          </button>
        </div>

      </div>
    </div>
  )
}
