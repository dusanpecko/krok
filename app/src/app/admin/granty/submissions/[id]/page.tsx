'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  getSubmissionById, 
  updateWorkflowStatus, 
  approveAndCreateProject,
  getEvaluatorsList,
  assignEvaluator
} from '../../actions'
import FormEngine from '@/components/admin/grants/FormEngine'
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Star, 
  TrendingUp, 
  UserCheck, 
  Undo,
  MessageSquare,
  DollarSign,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  darkBlue: '#002D72',
}

export default function AdminSubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [sub, setSub] = useState<any>(null)
  const [evaluators, setEvaluators] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Schvaľovacie polia
  const [approvedAmount, setApprovedAmount] = useState<string>('')
  const [vs, setVs] = useState<string>('')
  const [ss, setSs] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState<string>('')

  // Stav pre zobrazenie modálneho okna/sekcie
  const [actionType, setActionType] = useState<'approve' | 'return' | 'reject' | null>(null)

  // Načítanie prihlášky
  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getSubmissionById(id)
      if (!data) {
        setError('Prihláška sa nenašla.')
        setLoading(false)
        return
      }
      setSub(data)
      
      // Predvyplnenie hodnôt pre schválenie
      setApprovedAmount(data.data.text_14 || '')
      setVs(data.variable_symbol || '')
      setSs(data.specific_symbol || '')
      setAdminNotes(data.admin_notes || '')

      const evs = await getEvaluatorsList()
      setEvaluators(evs)
    } catch (err) {
      console.error('Failed to load detail data:', err)
      setError('Chyba pri načítaní údajov.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  // Akcia: Zmena hodnotiteľa
  const handleAssignEvaluator = async (evaluatorId: string) => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await assignEvaluator(id, evaluatorId === '' ? null : evaluatorId)
      if (res.success) {
        setSuccess('Hodnotiteľ bol úspešne zmenený.')
        await loadData()
      } else {
        setError(res.error || 'Zlyhalo priradenie hodnotiteľa.')
      }
    } catch (err) {
      setError('Chyba spojenia.')
    } finally {
      setSubmitting(false)
    }
  }

  // Akcia: Vrátiť na doplnenie
  const handleReturnForChanges = async () => {
    if (!adminNotes.trim()) {
      alert('Napíšte prosím žiadateľovi dôvod vrátenia a pokyny pre opravu.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await updateWorkflowStatus({
        submissionId: id,
        status: 'returned_for_changes',
        adminNotes: adminNotes
      })

      if (res.success) {
        setSuccess('Prihláška bola úspešne vrátená žiadateľovi na úpravu.')
        setActionType(null)
        await loadData()
      } else {
        setError(res.error || 'Zlyhalo vrátenie prihlášky.')
      }
    } catch (err) {
      setError('Chyba spojenia.')
    } finally {
      setSubmitting(false)
    }
  }

  // Akcia: Zamietnuť projekt
  const handleReject = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await updateWorkflowStatus({
        submissionId: id,
        status: 'rejected',
        adminNotes: adminNotes || null
      })

      if (res.success) {
        setSuccess('Projekt bol úspešne zamietnutý.')
        setActionType(null)
        await loadData()
      } else {
        setError(res.error || 'Zlyhalo zamietnutie projektu.')
      }
    } catch (err) {
      setError('Chyba spojenia.')
    } finally {
      setSubmitting(false)
    }
  }

  // Akcia: Schváliť a vytvoriť projekt v KROK!
  const handleApprove = async () => {
    const amount = parseFloat(approvedAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Zadajte platnú schválenú sumu.')
      return
    }
    if (!vs.trim() || !ss.trim()) {
      alert('Vyplňte prosím Variabilný symbol aj Špecifický symbol pre prepojenie s bankovým výpisom.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await approveAndCreateProject(id, amount, vs, ss)
      if (res.success) {
        setSuccess('Projekt bol úspešne schválený a bol preň vytvorený záznam v moduloch KROK!')
        setActionType(null)
        await loadData()
      } else {
        setError(res.error || 'Zlyhalo schválenie prihlášky.')
      }
    } catch (err) {
      setError('Chyba prepojenia s databázou.')
    } finally {
      setSubmitting(false)
    }
  }

  // Preklad stavov a farieb
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Rozpracovaný koncept (Zadávateľ)', color: 'bg-gray-100 text-gray-700 border-gray-200' }
      case 'submitted':
        return { label: 'Nové doručené (Na posúdenie)', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'returned_for_changes':
        return { label: 'Vrátený na doplnenie', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'accepted_for_evaluation':
        return { label: 'Posudzovaný (V hodnotení)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
      case 'evaluated':
        return { label: 'Ohodnotený (Posudok doručený)', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      case 'approved':
        return { label: 'Schválený a Spustený', color: 'bg-green-50 text-green-700 border-green-200' }
      case 'rejected':
        return { label: 'Zamietnutý / Neschválený', color: 'bg-red-50 text-red-700 border-red-200' }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Načítavam detaily prihlášky...</p>
        </div>
      </div>
    )
  }

  if (error && !sub) {
    return (
      <div className="bg-white rounded-3xl border border-gray-150 p-8 text-center max-w-md mx-auto mt-12">
        <AlertCircle size={28} className="mx-auto text-red-500 mb-2" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Chyba</h2>
        <p className="text-gray-500 text-xs mb-6">{error}</p>
        <Link href="/admin/granty" className="px-5 py-2 rounded-xl text-white font-bold text-xs" style={{ backgroundColor: KROK.blue }}>
          Späť na prehľad
        </Link>
      </div>
    )
  }

  const { label: statusLabel, color: statusColor } = getStatusDetails(sub.status)
  const projectName = sub.data.text_5 || sub.data.text_1 || `Projekt – ${sub.id.substring(0, 6)}`
  const applicantName = sub.data.text_1 || sub.data.text_2 || 'Neznámy žiadateľ'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/granty"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={14} />
        Späť na zoznam grantov
      </Link>

      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {sub.forms?.title}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {projectName}
          </h1>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            Predložil žiadateľ: {applicantName}
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-100 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-green-700 font-bold">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-600 font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ľavá strana: Vyplnená prihláška (View-Only) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-150 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-4 mb-6">
            <FileText className="text-red-500" size={20} />
            <h3 className="text-xs font-bold text-gray-900 uppercase">Obsah prihlášky</h3>
          </div>

          <FormEngine
            fields={sub.forms?.fields || []}
            initialData={sub.data || {}}
            isReadOnly={true}
            onSubmit={async () => {}}
          />
        </div>

        {/* Pravá strana: Riadenie workflow, posudky, schválenie */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* KARTA 1: Priradenie Hodnotiteľa (Kontrolóra) */}
          {sub.status !== 'approved' && sub.status !== 'rejected' && (
            <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
                <UserCheck size={15} className="text-blue-600" />
                Kontrolór / Hodnotiteľ projektu
              </h3>
              
              <div className="space-y-3">
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                  Priradením kontrolóra sa prihláška odošle do jeho chráneného dashboardu na posúdenie a stav sa zmení na posudzovaný.
                </p>
                <select
                  value={sub.assigned_evaluator_id || ''}
                  onChange={e => handleAssignEvaluator(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">-- Žiadny priradený hodnotiteľ --</option>
                  {evaluators.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* KARTA 2: Doručené hodnotenie a posudok kontrolóra */}
          {(sub.status === 'evaluated' || sub.status === 'approved' || sub.evaluation_rating) && (
            <div className="bg-white rounded-3xl border border-purple-150 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-purple-900 uppercase mb-3 flex items-center gap-1.5 border-b border-purple-100 pb-2.5">
                <Star size={15} className="text-purple-600 fill-purple-600" />
                Posudok a známka od Kontrolóra
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-purple-700">Ohodnotená kvalita:</span>
                  <span className="text-lg font-black text-purple-950">{sub.evaluation_rating} / 10 bodov</span>
                </div>

                {sub.evaluation_notes ? (
                  <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block mb-1">
                      Odborný posudok hodnotiteľa:
                    </span>
                    <p className="text-xs text-gray-700 italic whitespace-pre-wrap leading-relaxed">
                      "{sub.evaluation_notes}"
                    </p>
                    {sub.evaluated_at && (
                      <span className="text-[9px] text-gray-400 font-medium block mt-2 text-right">
                        Hodnotené dňa: {new Date(sub.evaluated_at).toLocaleDateString('sk-SK')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Posudok zatiaľ nebol zapísaný.</p>
                )}
              </div>
            </div>
          )}

          {/* KARTA 3: Akčný panel schvaľovania a VS/ŠS */}
          <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 uppercase mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
              <Briefcase size={15} className="text-red-500" />
              Schvaľovací proces & prepojenie s bankou
            </h3>

            {sub.status === 'approved' ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-2.5 text-xs text-green-800">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold block">Projekt bol schválený!</span>
                    <p className="mt-1">
                      Záznam bol automaticky zapísaný do modulu projektov a priradený k Variabilnému symbolu.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 border border-gray-150 rounded-xl p-3 font-semibold text-gray-700">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Schválená Suma</span>
                    <span className="text-sm font-black text-gray-900">{sub.approved_amount} €</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Projektové ID</span>
                    <span className="text-[10px] font-medium text-gray-500 font-mono truncate block">{sub.project_id}</span>
                  </div>
                  <div className="mt-2 border-t border-gray-150 pt-2 col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Variabilný symbol (žiadateľ)</span>
                    <span className="text-sm font-black text-blue-900 font-mono">{sub.variable_symbol}</span>
                  </div>
                  <div className="mt-2 border-t border-gray-150 pt-2 col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Špecifický symbol (projekt)</span>
                    <span className="text-sm font-black text-blue-900 font-mono">{sub.specific_symbol}</span>
                  </div>
                </div>
              </div>
            ) : sub.status === 'rejected' ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2.5 text-xs text-red-800 font-bold">
                <AlertCircle className="text-red-500 flex-shrink-0" size={16} />
                Projekt bol zamietnutý a neschválený.
              </div>
            ) : (
              <div className="space-y-3">
                {actionType === null ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setActionType('approve')}
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle size={14} />
                      Schváliť a vytvoriť projekt
                    </button>
                    
                    <button
                      onClick={() => setActionType('return')}
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl text-gray-700 bg-amber-50 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-all cursor-pointer"
                    >
                      <Undo size={14} className="text-amber-500" />
                      Vrátiť na doplnenie (Draft)
                    </button>

                    <button
                      onClick={() => setActionType('reject')}
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl text-gray-700 hover:text-red-500 bg-gray-50 border border-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <AlertCircle size={14} className="text-red-400" />
                      Zamietnuť žiadosť
                    </button>
                  </div>
                ) : (
                  // INTERAKTÍVNE SCHVAĽOVACIE FORMULÁRE PODĽA AKCIE
                  <div className="p-4 border border-gray-150 rounded-2xl bg-gray-50 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-[10px] font-black uppercase text-gray-800">
                        {actionType === 'approve' ? 'Schválenie projektu' : actionType === 'return' ? 'Vrátenie projektu' : 'Zamietnutie projektu'}
                      </span>
                      <button onClick={() => setActionType(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600">
                        Zrušiť
                      </button>
                    </div>

                    {/* Akcia A: Schválenie a auto-projekt */}
                    {actionType === 'approve' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                            Schválená suma z PF (€):
                          </label>
                          <input
                            type="number"
                            value={approvedAmount}
                            onChange={e => setApprovedAmount(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none"
                            placeholder="napr. 1200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                            Variabilný symbol (Žiadateľ):
                          </label>
                          <input
                            type="text"
                            value={vs}
                            onChange={e => setVs(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white font-mono focus:outline-none"
                            placeholder="napr. 2025001"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                            Špecifický symbol (Projekt pre banku):
                          </label>
                          <input
                            type="text"
                            value={ss}
                            onChange={e => setSs(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white font-mono focus:outline-none"
                            placeholder="napr. 777"
                            required
                          />
                        </div>
                        
                        <button
                          onClick={handleApprove}
                          disabled={submitting}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-xs bg-green-600 hover:bg-green-700 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle size={13} />
                          Schváliť a spustiť párovanie platieb
                        </button>
                      </div>
                    )}

                    {/* Akcia B: Vrátenie na doplnenie */}
                    {actionType === 'return' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                            Pokyny pre žiadateľa na opravu:
                          </label>
                          <textarea
                            value={adminNotes}
                            onChange={e => setAdminNotes(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none"
                            placeholder="Popíšte žiadateľovi čo má zmeniť, napr. 'Doplňte reálnejší začiatok alebo podrobnejší rozpočet...'"
                            required
                          />
                        </div>
                        
                        <button
                          onClick={handleReturnForChanges}
                          disabled={submitting}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-xs bg-amber-500 hover:bg-amber-600 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Undo size={13} />
                          Odoslať žiadateľovi na doplnenie
                        </button>
                      </div>
                    )}

                    {/* Akcia C: Zamietnutie */}
                    {actionType === 'reject' && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-red-500 font-semibold leading-relaxed">
                          Ste si istý, že chcete túto žiadosť definitívne zamietnuť? Žiadateľovi sa uzamkne možnosť zmien.
                        </p>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                            Zdôvodnenie (interné/externé):
                          </label>
                          <textarea
                            value={adminNotes}
                            onChange={e => setAdminNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none"
                            placeholder="Zadajte dôvod zamietnutia..."
                          />
                        </div>
                        
                        <button
                          onClick={handleReject}
                          disabled={submitting}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-xs bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <AlertCircle size={13} />
                          Potvrdiť zamietnutie
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
