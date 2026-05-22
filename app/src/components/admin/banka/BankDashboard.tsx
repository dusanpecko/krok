'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, Search, Filter, Loader2, CheckCircle2 } from 'lucide-react'
import TransactionList from './TransactionList'
import MatchDonorDialog from './MatchDonorDialog'
import { matchTransaction, bulkMatchAnonymous } from '@/app/admin/banka/actions'

interface BankDashboardProps {
  years: number[]
  projects: any[]
  initialData: any[]
  totalCount: number
  totalPages: number
  
  currentYear: number
  currentMonth: number | 'all'
  currentStatus: string
  currentQuery: string
  currentPage: number
}

const MONTHS = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December'
]

export default function BankDashboard(props: BankDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local state pre input vyhľadávania (debounce pre plynulosť)
  const [searchTerm, setSearchTerm] = useState(props.currentQuery)

  // Otevárame Match Dialog
  const [pairingTx, setPairingTx] = useState<any>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleQuickMatchAnon = async (tx: any) => {
    startTransition(async () => {
       const res = await matchTransaction(tx.id, '7aa76574-af94-45c8-b4ce-40b9995c8906')
       if (res.success) {
          setSuccessMsg('Platba bola úspešne priradená anonymnému darcovi.')
          setTimeout(() => setSuccessMsg(null), 3000)
          router.refresh()
       }
    })
  }

  const handleBulkMatchAnon = async () => {
    if (!confirm('Naozaj chcete spárovať VŠETKY aktuálne nespárované prichádzajúce platby (v tomto roku/mesiaci) ako anonymné dary?')) {
      return
    }

    startTransition(async () => {
      const res = await bulkMatchAnonymous({
        year: props.currentYear,
        month: props.currentMonth
      })

      if (res.success) {
        setSuccessMsg(`Hromadné spárovanie úspešné. Spracovaných platieb: ${res.count}`)
        setTimeout(() => setSuccessMsg(null), 5000)
        router.refresh()
      } else {
        alert(res.error || 'Nastala chyba pri hromadnom párovaní.')
      }
    })
  }

  const updateFilters = (key: string, value: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      
      // Ked zmenime iny filter ako stranku, resetuj stranku na 1
      if (key !== 'page') {
        params.delete('page')
      }
      
      router.push(`/admin/banka?${params.toString()}`)
    })
  }

  // Odchytenie stlačenia ENTER u text search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      updateFilters('q', searchTerm)
    }
  }

  return (
    <div className="space-y-6">
      {/* KARTY PRE ROKY */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-max shadow-inner">
          {props.years.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">Žiadne dostupné roky</div>
          )}
          {props.years.map((y) => (
            <button
              key={y}
              onClick={() => updateFilters('year', y.toString())}
              className={`
                px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 relative
                ${props.currentYear === y 
                  ? 'bg-white text-blue-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}
              `}
            >
              {y}
              {props.currentYear === y && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        <button 
          onClick={handleBulkMatchAnon}
          disabled={isPending}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Spárovať nespárované v tomto období (Anonymné)
        </button>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between">
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
           {/* Mesiac Picker */}
           <div className="relative">
             <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <select
               value={props.currentMonth}
               onChange={(e) => updateFilters('month', e.target.value === 'all' ? null : e.target.value)}
               className="pl-11 pr-10 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-100 appearance-none min-w-[160px]"
             >
               <option value="all">Celý rok</option>
               {MONTHS.map((m, i) => (
                 <option key={i+1} value={i+1}>{m}</option>
               ))}
             </select>
           </div>

           {/* Status Picker */}
           <div className="relative">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <select
               value={props.currentStatus}
               onChange={(e) => updateFilters('status', e.target.value === 'all' ? null : e.target.value)}
               className="pl-11 pr-10 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-100 appearance-none min-w-[160px]"
             >
               <option value="all">Všetky stavy</option>
               <option value="unmatched">Len nespárované (Choroby)</option>
               <option value="matched">Úspešne spárované</option>
             </select>
           </div>
        </div>

        {/* Vyhľadávanie vpravo */}
        <div className="w-full xl:w-96 relative">
          <input
            type="text"
            placeholder="Hľadať VS, názov, sumu, správu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full pl-6 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button 
             onClick={() => updateFilters('q', searchTerm)}
             className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors"
          >
            <Search size={16} />
          </button>
        </div>

      </div>

      {/* INDIKATOR NACITAVANIA PRI SERVER ACTION ZMENE */}
      {isPending && (
         <div className="flex items-center justify-center p-4 text-blue-500">
           <Loader2 className="animate-spin mr-2" size={20} /> Obnovujem dáta...
         </div>
      )}

      {successMsg && (
         <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
            <CheckCircle2 size={18} /> {successMsg}
         </div>
      )}

      {/* TABLE */}
      <TransactionList 
         transactions={props.initialData} 
         onPairClick={(tx) => setPairingTx(tx)}
         onQuickMatchAnon={handleQuickMatchAnon}
      />

      {/* PAGINATION */}
      {props.totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-6">
          <button
            onClick={() => updateFilters('page', (props.currentPage - 1).toString())}
            disabled={props.currentPage === 1}
            className="px-4 py-2 border rounded-xl text-sm font-bold text-gray-600 disabled:opacity-50"
          >
            Naspäť
          </button>
          
          <span className="px-4 py-2 text-sm font-mono text-gray-500">
            {props.currentPage} / {props.totalPages}
          </span>
          
          <button
            onClick={() => updateFilters('page', (props.currentPage + 1).toString())}
            disabled={props.currentPage >= props.totalPages}
            className="px-4 py-2 border rounded-xl text-sm font-bold text-blue-600 disabled:opacity-50"
          >
             Ďalej
          </button>
        </div>
      )}

      {/* MATCHING MODAL */}
      {pairingTx && (
        <MatchDonorDialog 
          transaction={pairingTx} 
          projects={props.projects}
          onClose={() => setPairingTx(null)} 
          onSuccess={() => {
             setPairingTx(null)
             updateFilters('page', String(props.currentPage)) // trigger re-render / fetch
          }}
        />
      )}

    </div>
  )
}
