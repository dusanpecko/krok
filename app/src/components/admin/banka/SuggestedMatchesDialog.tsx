'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle, User, ArrowRight, Check } from 'lucide-react'
import { getSuggestedMatches, matchTransaction, bulkMatchSuggested } from '@/app/admin/banka/actions'

interface SuggestedMatchesDialogProps {
  onClose: () => void
  onSuccess: () => void
}

export default function SuggestedMatchesDialog({ onClose, onSuccess }: SuggestedMatchesDialogProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedDonors, setSelectedDonors] = useState<Record<string, string>>({}) // Sledovanie vybratého darcu pre každú transakciu (txId -> donorId)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [pairingIds, setPairingIds] = useState<string[]>([]) // Sledovanie, ktoré transakcie sa práve párujú jednotlivo

  const fetchSuggestions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSuggestedMatches()
      setSuggestions(data)
      
      // Nastavíme predvoleného navrhnutého darcu pre každú transakciu
      const initialSelected: Record<string, string> = {}
      data.forEach((item: any) => {
        if (item.suggestedDonor?.id) {
          initialSelected[item.transaction.id] = item.suggestedDonor.id
        }
      })
      setSelectedDonors(initialSelected)
    } catch (err: any) {
      console.error('Error fetching suggestions:', err)
      setError('Nepodarilo sa načítať návrhy na párovanie.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions()
  }, [])

  // Aktualizácia zvoleného darcu pre danú transakciu
  const handleDonorChange = (txId: string, donorId: string) => {
    setSelectedDonors(prev => ({
      ...prev,
      [txId]: donorId
    }))
  }

  // Spárovať jedného konkrétneho navrhnutého darcu
  const handlePairIndividual = async (txId: string, donorId: string) => {
    setPairingIds(prev => [...prev, txId])
    setError(null)
    
    try {
      const res = await matchTransaction(txId, donorId)
      if (res.success) {
        setSuggestions(prev => prev.filter(item => item.transaction.id !== txId))
        setSuccessMsg('Platba bola úspešne spárovaná.')
        setTimeout(() => setSuccessMsg(null), 3000)
        onSuccess()
      } else {
        setError(res.error || 'Nastala chyba pri párovaní.')
      }
    } catch (err: any) {
      setError(err.message || 'Nastala neočakávaná chyba.')
    } finally {
      setPairingIds(prev => prev.filter(id => id !== txId))
    }
  }

  // Hromadné spárovanie všetkých zobrazených návrhov s rešpektovaním vybratých darcov
  const handleBulkPair = async () => {
    if (suggestions.length === 0) return
    
    const duplicatesCount = suggestions.filter(item => item.hasMultipleMatches).length
    let confirmMsg = `Naozaj chcete hromadne spárovať všetkých ${suggestions.length} navrhnutých darcov s ich platbami?`
    
    if (duplicatesCount > 0) {
      confirmMsg = `Naozaj chcete hromadne spárovať všetkých ${suggestions.length} navrhnutých darcov s ich platbami?\n\n⚠️ Upozornenie: Zistilo sa ${duplicatesCount} platieb s viacerými možnými zhodami v databáze. Skontrolujte prosím, či ste vybrali správne osoby.`
    }
    
    if (!confirm(confirmMsg)) {
      return
    }

    startTransition(async () => {
      setError(null)
      const matches = suggestions.map(item => ({
        transactionId: item.transaction.id,
        donorId: selectedDonors[item.transaction.id] || item.suggestedDonor.id,
        amount: item.transaction.amount,
        bookingDate: item.transaction.booking_date
      }))

      try {
        const res = await bulkMatchSuggested(matches)
        if (res.success) {
          setSuccessMsg(`Úspešne sa hromadne spárovalo ${res.count} platieb!`)
          setSuggestions([])
          setTimeout(() => {
            setSuccessMsg(null)
            onClose()
          }, 3000)
          onSuccess()
        } else {
          setError(res.error || 'Nastala chyba pri hromadnom párovaní.')
        }
      } catch (err: any) {
        setError(err.message || 'Nastala neočakávaná chyba.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Hlavička */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Inteligentné návrhy na párovanie</h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">Systém našiel pravdepodobných darcov na základe IBAN účtov, symbolov alebo mena</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info panel & Globálne akcie */}
        <div className="px-8 py-4 bg-blue-50/30 border-b border-blue-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-bold text-blue-800">
            {isLoading ? (
              <span>Analyzujem nespárované platby...</span>
            ) : suggestions.length > 0 ? (
              <span>Nájdených <strong className="text-indigo-600 text-base">{suggestions.length}</strong> pravdepodobných zhôd.</span>
            ) : (
              <span>Nenašli sa žiadne nové automatické návrhy na párovanie.</span>
            )}
          </div>
          
          {suggestions.length > 0 && !isLoading && (
            <button
              onClick={handleBulkPair}
              disabled={isPending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Globálne spárovať všetkých ({suggestions.length})
            </button>
          )}
        </div>

        {/* Telo / Zoznam návrhov */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-700 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <CheckCircle2 size={18} /> {successMsg}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="animate-spin text-blue-600" size={36} />
              <p className="font-bold">Prebieha inteligentná analýza platieb...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                <Check size={28} />
              </div>
              <h3 className="text-lg font-black text-gray-900">Všetko je čisté!</h3>
              <p className="text-sm text-gray-400 mt-2 max-w-sm">
                Pre aktuálne nespárované platby systém nenašiel žiadnych jednoznačných darcov podľa mena, VS ani IBAN. Použite manuálne vyhľadávanie.
              </p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="px-6 py-4">Prijatá platba</th>
                    <th className="px-6 py-4 text-center"></th>
                    <th className="px-6 py-4">Navrhovaný darca</th>
                    <th className="px-6 py-4">Dôvod zhody</th>
                    <th className="px-6 py-4 text-right">Akcia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {suggestions.map((item) => {
                    const tx = item.transaction
                    const donor = item.suggestedDonor
                    const isPairing = pairingIds.includes(tx.id) || isPending
                    const selectedDonorId = selectedDonors[tx.id] || donor.id

                    return (
                      <tr key={tx.id} className="hover:bg-blue-50/10 transition-colors">
                        {/* Platba */}
                        <td className="px-6 py-4 align-top">
                          <div className="text-sm font-bold text-gray-900">
                            {tx.counterparty_name || <span className="italic text-gray-400">Neznáme meno</span>}
                          </div>
                          <div className="text-[10px] font-mono text-gray-500 mt-0.5">{tx.counterparty_iban || 'Banka'}</div>
                          <div className="flex gap-2 items-center mt-1.5">
                            <span className="text-xs font-black text-green-600">+{tx.amount.toFixed(2)} EUR</span>
                            {tx.variable_symbol && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-[10px] text-gray-500 font-mono rounded">
                                VS:{tx.variable_symbol}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Prepojenie ikona */}
                        <td className="px-4 py-4 text-center align-top pt-6">
                          <ArrowRight size={16} className="text-gray-300 mx-auto" />
                        </td>

                        {/* Navrhovaný darca */}
                        <td className="px-6 py-4 align-top max-w-[280px]">
                          {item.hasMultipleMatches ? (
                            <div className="flex flex-col gap-2">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black uppercase tracking-wider rounded-md w-max select-none">
                                <AlertCircle size={10} className="text-amber-600 shrink-0" />
                                Viacero zhôd ({item.allCandidates.length})
                              </div>
                              <select
                                value={selectedDonorId}
                                onChange={(e) => handleDonorChange(tx.id, e.target.value)}
                                className="w-full text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:bg-gray-100/50"
                              >
                                {item.allCandidates.map((cand: any) => (
                                  <option key={cand.id} value={cand.id}>
                                    {cand.first_name} {cand.last_name} ({cand.city || 'Bez mesta'}) {cand.variable_symbol ? `[VS: ${cand.variable_symbol}]` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <User size={12} />
                                </div>
                                <div className="text-sm font-black text-blue-900">
                                  {donor.first_name} {donor.last_name}
                                </div>
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono mt-1 flex gap-2">
                                {donor.variable_symbol && <span>VS: {donor.variable_symbol}</span>}
                                {donor.city && <span>• {donor.city}</span>}
                              </div>
                            </>
                          )}

                          {/* Dynamická informácia o pravidelnosti */}
                          {(() => {
                            const currentSelectedDonor = item.allCandidates.find((c: any) => c.id === selectedDonorId) || donor
                            return (
                              <div className="mt-2 text-[10px] font-bold text-gray-500 flex items-start gap-1 bg-slate-50/70 border border-slate-100/80 p-2 rounded-xl">
                                <span className="text-indigo-500 shrink-0 select-none text-[11px] mt-0.5">💡</span>
                                <span className="text-slate-600 leading-normal">
                                  {currentSelectedDonor.regularityHint || 'Nový darca (bez doterajšej histórie príspevkov)'}
                                </span>
                              </div>
                            )
                          })()}
                        </td>

                        {/* Dôvod zhody */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-700">{item.reason}</span>
                            <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  item.confidence === 100 
                                    ? 'bg-green-500' 
                                    : item.confidence === 90 
                                    ? 'bg-blue-500' 
                                    : 'bg-indigo-400'
                                }`} 
                                style={{ width: `${item.confidence}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 tracking-wide uppercase">Istota {item.confidence}%</span>
                          </div>
                        </td>

                        {/* Akcia tlačidlo */}
                        <td className="px-6 py-4 text-right align-top pt-5">
                          <button
                            onClick={() => handlePairIndividual(tx.id, selectedDonorId)}
                            disabled={isPairing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-black transition-all disabled:opacity-50"
                          >
                            {isPairing ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            Spárovať
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Päta */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Zavrieť
          </button>
        </div>

      </div>
    </div>
  )
}
