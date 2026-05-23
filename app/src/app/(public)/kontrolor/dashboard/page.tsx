'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  getLoggedUserRoles, 
  getEvaluatorSubmissions, 
  submitEvaluation 
} from '@/app/admin/granty/actions'
import { 
  FolderHeart, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Star, 
  FileText, 
  MessageSquare, 
  Calendar, 
  Send,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Download
} from 'lucide-react'
import FormEngine from '@/components/admin/grants/FormEngine'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  darkBlue: '#002D72',
}

export default function KontrolorDashboard() {
  const { session, sessionChecked } = useSupabase()
  const router = useRouter()

  const [isEvaluator, setIsEvaluator] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [selectedSub, setSelectedSub] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Polia pre hodnotenie
  const [rating, setRating] = useState<number>(5)
  const [notes, setNotes] = useState<string>('')

  // 1. Zabezpečenie: Kontrola prihlásenia
  useEffect(() => {
    if (sessionChecked && !session) {
      router.replace(`/prihlasenie?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [session, sessionChecked, router])

  // 2. Načítanie rolí a pridelených prihlášok
  const loadDashboardData = async () => {
    if (!session?.user) return
    setLoading(true)
    setError(null)

    try {
      const res = await getLoggedUserRoles()
      const userRoles = res.roles as string[]
      const hasRole = userRoles.includes('kontrolor') || userRoles.includes('administrator')
      setIsEvaluator(hasRole)

      if (hasRole) {
        const subs = await getEvaluatorSubmissions()
        setSubmissions(subs)
      } else {
        setError('Nemáte prístup do hodnotiacej zóny. Táto zóna je vyhradená pre kontrolórov.')
      }
    } catch (err) {
      console.error('Failed to load evaluator data:', err)
      setError('Zlyhalo načítanie projektov na hodnotenie.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session])

  // 3. Odoslanie posudku a známky
  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSub) return
    
    setEvaluating(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await submitEvaluation({
        submissionId: selectedSub.id,
        rating,
        notes
      })

      if (res.success) {
        setSuccessMsg('Posudok a známka boli úspešne uložené!')
        setSelectedSub(null)
        setNotes('')
        setRating(5)
        // Znova načítať
        const subs = await getEvaluatorSubmissions()
        setSubmissions(subs)
      } else {
        setError(res.error || 'Nepodarilo sa odoslať posudok.')
      }
    } catch (err) {
      setError('Nastala chyba pri odosielaní.')
    } finally {
      setEvaluating(false)
    }
  }

  if (!sessionChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Načítavam hodnotiaci panel...</p>
        </div>
      </div>
    )
  }

  // PRÍPAD A: Používateľ nie je kontrolór
  if (!isEvaluator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md border border-gray-150">
          <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Prístup zamietnutý</h2>
          <p className="text-gray-500 text-sm mb-6">
            Nemáte priradenú rolu <b>kontrolor</b>. Ak ste zamestnancom alebo spolupracovníkom pastoračného fondu, kontaktujte administrátora.
          </p>
          <button onClick={() => router.push('/')} className="px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-all" style={{ backgroundColor: KROK.blue }}>
            Späť na úvod
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
              <UserCheck size={14} className="text-yellow-500" />
              Zabezpečená zóna kontrolóra
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Hodnotenie Projektov a Posudky
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-600">{successMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Ľavá strana: Zoznam priradených projektov */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Priradené projekty na posúdenie ({submissions.length})
            </h2>

            {submissions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-150 p-6 text-center">
                <FolderHeart size={20} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-xs italic">Žiadne projekty nečakajú na vaše hodnotenie.</p>
              </div>
            ) : (
              submissions.map(sub => {
                const projectName = sub.data.text_5 || sub.data.text_1 || `Projekt – ${sub.id.substring(0, 6)}`
                const requestedAmount = sub.data.text_14 ? `${sub.data.text_14} €` : 'Nezadané'
                const isSelected = selectedSub?.id === sub.id

                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSub(sub)
                      setRating(sub.evaluation_rating || 5)
                      setNotes(sub.evaluation_notes || '')
                      setSuccessMsg(null)
                    }}
                    className={`w-full text-left bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col gap-2 hover:shadow-md ${
                      isSelected ? 'border-blue-600 ring-2 ring-blue-50' : 'border-gray-150'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate max-w-[200px]">
                        {sub.forms?.title}
                      </span>
                      {sub.status === 'evaluated' ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-green-50 text-green-700 border border-green-200">
                          Hodnotený ({sub.evaluation_rating}/10)
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Na Hodnotenie
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 line-clamp-1">
                      {projectName}
                    </h3>

                    <div className="flex justify-between items-center w-full text-[10px] text-gray-400">
                      <span>Doručené: {new Date(sub.created_at).toLocaleDateString('sk-SK')}</span>
                      <span>Požadovaná suma: <b>{requestedAmount}</b></span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Pravá strana: Detail a hodnotiaci formulár */}
          <div className="lg:col-span-7">
            {selectedSub ? (
              <div className="space-y-6">
                {/* Posudok a rating karta */}
                <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
                    <Star className="text-yellow-500 fill-yellow-500" size={20} />
                    <h3 className="text-sm font-extrabold text-gray-900 uppercase">Ohodnotiť kvalitu projektu</h3>
                  </div>

                  <form onSubmit={handleEvaluationSubmit} className="space-y-4">
                    {/* Slider 1 až 10 */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-gray-700">Bodové hodnotenie (1 - 10):</label>
                        <span className="text-lg font-black text-blue-900">{rating} / 10 bodov</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={rating}
                        onChange={e => setRating(parseInt(e.target.value))}
                        disabled={evaluating}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#003DA5]"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold px-1 mt-1 uppercase">
                        <span>1 - Slabý</span>
                        <span>5 - Priemerný</span>
                        <span>10 - Výnimočný</span>
                      </div>
                    </div>

                    {/* Textový posudok */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Odborné hodnotenie a posudok (kontrolná správa):
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        disabled={evaluating}
                        rows={6}
                        placeholder="Popíšte silné a slabé stránky projektu, súlad s cieľmi pastoračného fondu a odporúčania..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent focus:ring-blue-100 transition-all shadow-inner"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={evaluating}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:shadow-md cursor-pointer"
                      style={{ backgroundColor: KROK.blue }}
                    >
                      {evaluating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Ukladám posudok...
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          Odoslať odborné hodnotenie
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Čítačka prihlášky (View-Only) */}
                <div className="bg-white rounded-3xl border border-gray-150 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
                    <FileText className="text-red-500" size={20} />
                    <h3 className="text-sm font-extrabold text-gray-900 uppercase">Vyplnená prihláška žiadateľa</h3>
                  </div>

                  <FormEngine
                    fields={selectedSub.forms?.fields || []}
                    initialData={selectedSub.data || {}}
                    isReadOnly={true}
                    onSubmit={async () => {}}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-150 p-12 text-center shadow-sm h-full flex flex-col justify-center items-center">
                <FileText size={40} className="text-gray-200 mb-4" />
                <h3 className="text-md font-bold text-gray-700 mb-1">Žiadny projekt nie je vybraný</h3>
                <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
                  Vyberte si projekt zo zoznamu vľavo pre zobrazenie detailov a ohodnotenie kvality.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
