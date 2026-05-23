'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  upgradeToZadavatel, 
  getMySubmissions, 
  getLoggedUserRoles 
} from '@/app/admin/granty/actions'
import { 
  FolderHeart, 
  FileEdit, 
  PlusCircle, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Info, 
  UserCheck, 
  TrendingUp, 
  Landmark, 
  FileText 
} from 'lucide-react'
import Link from 'next/link'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  sidebar: '#002D72',
}

export default function GrantyDashboard() {
  const { session, sessionChecked } = useSupabase()
  const router = useRouter()

  const [roles, setRoles] = useState<string[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Presmerovanie ak nie je prihlásený
  useEffect(() => {
    if (sessionChecked && !session) {
      router.replace(`/prihlasenie?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [session, sessionChecked, router])

  // 2. Načítanie rolí a prihlášok
  const loadDashboardData = async () => {
    if (!session?.user) return
    setLoading(true)
    setError(null)

    try {
      const res = await getLoggedUserRoles()
      const userRoles = res.roles as string[]
      setRoles(userRoles)

      if (userRoles.includes('zadavatel')) {
        const subs = await getMySubmissions()
        setSubmissions(subs)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Nepodarilo sa načítať údaje. Skúste to znova neskôr.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session])

  // 3. Spustenie akcie na udelenie role Zadávateľa ( upgrade darcu )
  const handleUpgrade = async () => {
    setUpgrading(true)
    setError(null)
    try {
      const res = await upgradeToZadavatel()
      if (res.success) {
        await loadDashboardData()
      } else {
        setError(res.error || 'Nastala chyba pri aktivácii role.')
      }
    } catch (err) {
      setError('Spojenie zlyhalo. Skúste to znova.')
    } finally {
      setUpgrading(false)
    }
  }

  // Preklad stavov a farieb pre workflow žiadostí
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Rozpracovaný', color: 'bg-gray-100 text-gray-700 border-gray-200' }
      case 'submitted':
        return { label: 'Podaný / Odoslaný', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'returned_for_changes':
        return { label: 'Vrátený na doplnenie', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'accepted_for_evaluation':
        return { label: 'Prijatý na hodnotenie', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
      case 'evaluated':
        return { label: 'Hodnotený', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      case 'approved':
        return { label: 'Schválený', color: 'bg-green-50 text-green-700 border-green-200' }
      case 'rejected':
        return { label: 'Neschválený', color: 'bg-red-50 text-red-700 border-red-200' }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
    }
  }

  if (!sessionChecked || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-500 text-sm">Načítavam klientsky panel grantov...</p>
        </div>
      </div>
    )
  }

  // PRÍPAD A: Používateľ (Darca) nemá zatiaľ rolu zadavatel
  // Zobrazíme prémiovú CTA kartu na aktiváciu „Darca + Zadávateľ“
  if (!roles.includes('zadavatel')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-br from-[#002D72] via-[#003DA5] to-[#0072CE] rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Dekoratívne kruhy */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-yellow-300 border border-white/10 mb-6">
              <FolderHeart size={14} />
              KROK – Pastoračný fond Žilinskej diecézy
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
              Máte záujem predložiť grantový projekt?
            </h1>
            
            <p className="text-sm sm:text-base text-blue-100/90 max-w-2xl mb-8 leading-relaxed">
              Pastoračný fond KROK podporuje zmysluplné projekty farností, spoločenstiev a neformálnych skupín 
              zamerané na obnovu vzťahov, komunitného a duchovného života v Žilinskej diecéze. 
              Klasifikujte sa ako **Zadávateľ projektov** – váš profil darcu ostane nedotknutý a odomkne sa pred vami možnosť podávať žiadosti a záverečné správy.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center gap-3">
                <AlertCircle size={20} className="text-red-300 flex-shrink-0" />
                <p className="text-sm text-red-100">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-blue-900 font-bold text-sm bg-yellow-300 hover:bg-yellow-400 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {upgrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                  Aktivujem rolu zadávateľa...
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  Mám záujem podať projekt (Aktivovať rolu zadávateľa)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // PRÍPAD B: Používateľ je úspešne klasifikovaný ako Darca + Zadávateľ
  // Zobrazujeme kompletný klientsky portál pre granty
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
            <FolderHeart size={14} className="text-red-500" />
            Klientsky panel pre granty
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Moje Projekty a Žiadosti
          </h1>
        </div>

        {/* Akcie na vytvorenie novej žiadosti */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/granty/ziadost-cesty-obnovy-2025"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:shadow-md transition-all"
            style={{ backgroundColor: KROK.blue }}
          >
            <PlusCircle size={14} />
            Podať Žiadosť o projekt
          </Link>
          <Link
            href="/granty/zaverecna-sprava-2025"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs shadow-sm hover:bg-gray-50 transition-all"
          >
            <FileText size={14} className="text-red-500" />
            Podať Záverečnú správu
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Zoznam doručených/rozpracovaných formulárov */}
      {submissions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderHeart size={24} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Nemáte zatiaľ žiadne žiadosti</h3>
          <p className="text-gray-400 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
            Ešte ste nepredložili žiadny projekt v aktuálnej výzve. Kliknutím na tlačidlo vyššie môžete založiť novú žiadosť.
          </p>
          <Link
            href="/granty/ziadost-cesty-obnovy-2025"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
            style={{ backgroundColor: KROK.blue }}
          >
            <PlusCircle size={14} />
            Vytvoriť prvú žiadosť
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => {
            const { label: statusLabel, color: statusColor } = getStatusDetails(sub.status)
            const projectName = sub.data.text_5 || sub.data.text_1 || `Bez názvu – ${sub.id.substring(0, 6)}`
            const requestedAmount = sub.data.text_14 ? `${sub.data.text_14} €` : 'Nezadané'

            return (
              <div 
                key={sub.id} 
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  {/* Horný stavový riadok karty */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {sub.forms?.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Názov projektu */}
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1 truncate">
                    {projectName}
                  </h3>

                  {/* Info o doručení a financiách */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>Doručené: {new Date(sub.created_at).toLocaleDateString('sk-SK')}</span>
                    {sub.data.text_14 && (
                      <span>Požadovaná suma: <strong className="text-gray-700 font-semibold">{requestedAmount}</strong></span>
                    )}
                  </div>

                  {/* Špeciálne zobrazenie pre schválené projekty (Pridelená suma a VS) */}
                  {sub.status === 'approved' && (
                    <div className="mt-3.5 pt-3.5 border-t border-dashed border-gray-100 flex flex-wrap gap-x-6 gap-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-green-700 font-bold bg-green-50/50 px-2.5 py-1 rounded-lg">
                        <TrendingUp size={14} />
                        Schválená suma: {sub.approved_amount} €
                      </div>
                      {sub.variable_symbol && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 font-bold bg-blue-50/50 px-2.5 py-1 rounded-lg">
                          <Landmark size={14} />
                          Variabilný Symbol: {sub.variable_symbol}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upozornenie pre projekty vrátené na doplnenie */}
                  {sub.status === 'returned_for_changes' && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-xs flex gap-2">
                      <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Projekt vám bol vrátený na doplnenie s komentárom:</span>
                        <p className="text-amber-800 mt-1 italic">
                          {sub.admin_notes || 'Doplňte prosím chýbajúci rozpočet alebo detaily k aktivite.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tlačidlá akcií vpravo */}
                <div className="flex gap-2 self-stretch md:self-auto justify-end">
                  {/* Upraviť projekt (Len ak je draft alebo returned_for_changes) */}
                  {(sub.status === 'draft' || sub.status === 'returned_for_changes') ? (
                    <Link
                      href={`/granty/${sub.forms?.slug}?id=${sub.id}`}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl text-white font-bold text-xs hover:scale-[1.02] transition-all shadow-sm"
                      style={{ backgroundColor: KROK.blue }}
                    >
                      <FileEdit size={13} />
                      Upraviť
                    </Link>
                  ) : (
                    // V ostatných stavoch iba Zobraziť (View-Only)
                    <Link
                      href={`/granty/${sub.forms?.slug}?id=${sub.id}&readOnly=true`}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-100 transition-all shadow-sm"
                    >
                      Zobraziť
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
