'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useEffect, useState } from 'react'
import { Users, Landmark, TrendingUp, TrendingDown, ArrowUpRight, Clock, AlertCircle } from 'lucide-react'

// KROK brand farby
const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
}

interface DashboardStats {
  totalDonors: number
  activeDonors: number
  totalDonationsThisMonth: number
  totalAmountThisMonth: number
  totalAmountThisYear: number
  unmatchedTransactions: number
  lastImportDate: string | null
}

export default function AdminDashboard() {
  const { supabase } = useSupabase()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentDonations, setRecentDonations] = useState<any[]>([])

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Darcovia
        const { count: totalDonors } = await supabase
          .from('donors').select('*', { count: 'exact', head: true })
        const { count: activeDonors } = await supabase
          .from('donors').select('*', { count: 'exact', head: true }).eq('status', 'active')

        // Bankové transakcie – tento mesiac (príjmy)
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

        const { data: monthTx } = await supabase
          .from('bank_transactions')
          .select('amount')
          .eq('direction', 'credit')
          .gte('booking_date', startOfMonth)

        const { data: yearTx } = await supabase
          .from('bank_transactions')
          .select('amount')
          .eq('direction', 'credit')
          .gte('booking_date', startOfYear)

        const { count: unmatchedCount } = await supabase
          .from('bank_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('matched', false)
          .eq('direction', 'credit')

        // Posledné dary
        const { data: recent } = await supabase
          .from('bank_transactions')
          .select('*')
          .eq('direction', 'credit')
          .order('booking_date', { ascending: false })
          .limit(8)

        const totalAmountMonth = monthTx?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const totalAmountYear = yearTx?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        setStats({
          totalDonors: totalDonors || 0,
          activeDonors: activeDonors || 0,
          totalDonationsThisMonth: monthTx?.length || 0,
          totalAmountThisMonth: totalAmountMonth,
          totalAmountThisYear: totalAmountYear,
          unmatchedTransactions: unmatchedCount || 0,
          lastImportDate: null,
        })
        setRecentDonations(recent || [])
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Darcovia',
      value: stats?.totalDonors || 0,
      sub: `${stats?.activeDonors || 0} aktívnych`,
      icon: Users,
      color: KROK.blue,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Príjmy tento mesiac',
      value: `${(stats?.totalAmountThisMonth || 0).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €`,
      sub: `${stats?.totalDonationsThisMonth || 0} transakcií`,
      icon: TrendingUp,
      color: '#059669',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Príjmy tento rok',
      value: `${(stats?.totalAmountThisYear || 0).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €`,
      sub: new Date().getFullYear().toString(),
      icon: Landmark,
      color: KROK.lightBlue,
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-700',
    },
    {
      label: 'Nespárované',
      value: stats?.unmatchedTransactions || 0,
      sub: 'čakajú na párovanie',
      icon: AlertCircle,
      color: stats?.unmatchedTransactions ? KROK.red : '#059669',
      bgColor: stats?.unmatchedTransactions ? 'bg-red-50' : 'bg-emerald-50',
      textColor: stats?.unmatchedTransactions ? 'text-red-700' : 'text-emerald-700',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Prehľad pastoračného fondu KROK</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: card.color }}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`${card.bgColor} p-2.5 rounded-lg`}>
                  <Icon size={20} className={card.textColor} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Posledné transakcie */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Posledné príjmy</h2>
            <p className="text-xs text-gray-400 mt-0.5">Najnovšie prijaté transakcie</p>
          </div>
          <a href="/admin/banka" className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: KROK.blue }}>
            Zobraziť všetky <ArrowUpRight size={14} />
          </a>
        </div>

        {recentDonations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Zatiaľ žiadne transakcie</p>
            <p className="text-gray-400 text-sm mt-1">Importujte bankový výpis pre zobrazenie dát</p>
            <a href="/admin/import" className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors" style={{ backgroundColor: KROK.blue }}>
              Importovať výpis
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="px-6 py-3 font-medium">Dátum</th>
                  <th className="px-6 py-3 font-medium">Odosielateľ</th>
                  <th className="px-6 py-3 font-medium">VS</th>
                  <th className="px-6 py-3 font-medium">Suma</th>
                  <th className="px-6 py-3 font-medium">Stav</th>
                </tr>
              </thead>
              <tbody>
                {recentDonations.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 text-gray-600">{tx.booking_date}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{tx.counterparty_name || '—'}</td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{tx.variable_symbol || '—'}</td>
                    <td className="px-6 py-3 font-semibold" style={{ color: '#059669' }}>
                      +{Number(tx.amount).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-6 py-3">
                      {tx.matched ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Spárované
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          Nespárované
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
