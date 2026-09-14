'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, ChevronRight, CreditCard, RefreshCw, Repeat, XCircle, AlertTriangle } from 'lucide-react'
import {
  adminCancelOnlineSubscription,
  adminSyncOnlinePayment,
  getMollieStatus,
  getOnlinePaymentsAdmin,
  getOnlineSubscriptionsAdmin,
  type AdminOnlinePayment,
  type AdminOnlineSubscription,
  type MollieStatus,
} from './actions'
import { isSubscriptionStuck } from './stuck'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Zaplatené', className: 'bg-green-50 text-green-700 border-green-200' },
  open: { label: 'Otvorené', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  pending: { label: 'Čaká', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  authorized: { label: 'Autorizované', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Zlyhalo', className: 'bg-red-50 text-red-700 border-red-200' },
  canceled: { label: 'Zrušené', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  expired: { label: 'Expirované', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  // predplatné
  active: { label: 'Aktívne', className: 'bg-green-50 text-green-700 border-green-200' },
  activating: { label: 'Aktivuje sa', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  past_due: { label: 'Neuhradené', className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Zrušené', className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const KIND_LABELS: Record<string, string> = {
  one_time: 'Jednorazový',
  recurring_first: 'Pravidelný – 1. platba',
  recurring: 'Pravidelný – opakovaná',
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, className: 'bg-gray-50 text-gray-600 border-gray-200' }
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${s.className}`}>
      {s.label}
    </span>
  )
}

function donorLabel(row: { donors: { first_name: string; last_name: string } | null; donor_name: string | null; email: string | null }) {
  if (row.donors) return `${row.donors.first_name} ${row.donors.last_name}`.trim()
  return row.donor_name || row.email || '—'
}

function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('sk-SK', { dateStyle: 'short', timeStyle: 'short' })
}

function fmtDay(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('sk-SK')
}

export default function OnlinePaymentsAdminPage() {
  const [tab, setTab] = useState<'payments' | 'subscriptions'>('payments')
  const [status, setStatus] = useState<MollieStatus | null>(null)
  const [payments, setPayments] = useState<AdminOnlinePayment[]>([])
  const [subscriptions, setSubscriptions] = useState<AdminOnlineSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [st, p, s] = await Promise.all([getMollieStatus(), getOnlinePaymentsAdmin(), getOnlineSubscriptionsAdmin()])
      setStatus(st)
      setPayments(p)
      setSubscriptions(s)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSync = async (molliePaymentId: string) => {
    setBusyId(molliePaymentId)
    const res = await adminSyncOnlinePayment(molliePaymentId)
    setBusyId(null)
    if (!res.success) alert(res.error)
    else load()
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Naozaj zrušiť tento pravidelný dar? Mollie prestane sťahovať ďalšie platby.')) return
    setBusyId(id)
    const res = await adminCancelOnlineSubscription(id)
    setBusyId(null)
    if (!res.success) alert(res.error)
    else load()
  }

  const stuck = payments.filter(isSubscriptionStuck)
  const paidTotal = payments.filter((p) => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0)
  const activeSubs = subscriptions.filter((s) => s.status === 'active')
  const monthlyEquivalent = activeSubs.reduce((acc, s) => acc + (s.interval === 'year' ? s.amount / 12 : s.amount), 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link href="/admin" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <div className="flex items-center gap-1">
          <CreditCard size={12} /> <span className="text-gray-900">Online platby</span>
        </div>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Online platby</h1>
          <p className="text-gray-500 mt-1">Dary kartou cez platobnú bránu Mollie – jednorazové aj pravidelné</p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border ${
                !status.configured
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : status.mode === 'live'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {!status.configured ? (
                <>
                  <AlertTriangle size={14} /> Mollie nenakonfigurované
                </>
              ) : (
                <>Mollie – režim {status.mode === 'live' ? 'LIVE' : 'TEST'}</>
              )}
            </span>
          )}
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Obnoviť
          </button>
        </div>
      </div>

      {/* Výstraha: zaplatené, ale predplatné sa nezaložilo */}
      {stuck.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-black text-red-800">
                {stuck.length === 1
                  ? 'Zaplatená prvá platba bez založeného predplatného'
                  : `${stuck.length} zaplatené prvé platby bez založeného predplatného`}
              </h2>
              <p className="text-sm text-red-700 mt-1">
                Darca zaplatil, ale Mollie predplatné sa nevytvorilo (webhook nedorazil alebo Mollie odmietlo
                požiadavku). Opakované platby preto nebežia. Skúste Sync – aktivácia sa zopakuje. Ak zlyhá znova,
                dôvod od Mollie sa zobrazí pri platbe nižšie.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {stuck.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-red-100 rounded-2xl px-4 py-3"
              >
                <div className="text-sm">
                  <span className="font-bold text-gray-900">{donorLabel(p)}</span>
                  <span className="text-gray-500"> · {p.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} · {fmtDate(p.paid_at ?? p.created_at)}</span>
                  <span className="font-mono text-xs text-gray-400 block sm:inline sm:ml-2">{p.mollie_payment_id}</span>
                  {p.subscription?.metadata?.last_activation_error && (
                    <span className="block text-xs text-red-700 mt-1">
                      Mollie: {p.subscription.metadata.last_activation_error}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleSync(p.mollie_payment_id)}
                  disabled={busyId === p.mollie_payment_id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 self-start sm:self-auto"
                >
                  <RefreshCw size={12} className={busyId === p.mollie_payment_id ? 'animate-spin' : ''} /> Sync a založiť predplatné
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Súhrn */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Zaplatené online (zobrazené)</p>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {paidTotal.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aktívne pravidelné dary</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{activeSubs.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mesačný ekvivalent</p>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {monthlyEquivalent.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </div>

      {/* Taby */}
      <div className="flex gap-2 border-b border-gray-200">
        {(
          [
            { id: 'payments', label: 'Platby', icon: CreditCard, count: payments.length },
            { id: 'subscriptions', label: 'Pravidelné dary', icon: Repeat, count: subscriptions.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <t.icon size={16} /> {t.label}
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-black">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Načítavam…</div>
        ) : tab === 'payments' ? (
          payments.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Zatiaľ žiadne online platby.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <tr>
                    <th className="text-left px-5 py-3">Dátum</th>
                    <th className="text-left px-5 py-3">Darca</th>
                    <th className="text-left px-5 py-3">Typ</th>
                    <th className="text-right px-5 py-3">Suma</th>
                    <th className="text-left px-5 py-3">Stav</th>
                    <th className="text-left px-5 py-3">Mollie ID</th>
                    <th className="text-right px-5 py-3">Akcie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmtDate(p.paid_at ?? p.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-gray-900">
                          {p.donor_id ? (
                            <Link href={`/admin/darcovia/${p.donor_id}`} className="hover:text-blue-600">
                              {donorLabel(p)}
                            </Link>
                          ) : (
                            donorLabel(p)
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {p.email}
                          {p.donors?.variable_symbol ? ` · VS ${p.donors.variable_symbol}` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {KIND_LABELS[p.kind] ?? p.kind}
                        {p.method ? <span className="text-xs text-gray-400"> · {p.method}</span> : null}
                        {p.mode === 'test' && <span className="ml-2 text-[9px] font-black text-amber-600 uppercase">test</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-black text-gray-900 whitespace-nowrap">
                        {p.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} />
                        {p.status === 'paid' && !p.donation_id && (
                          <span className="ml-2 text-[10px] text-red-600 font-bold" title="Dar nie je zapísaný v donations">
                            bez daru
                          </span>
                        )}
                        {isSubscriptionStuck(p) && (
                          <span className="ml-2 text-[10px] text-red-600 font-bold" title="Mollie predplatné sa nezaložilo">
                            bez predplatného
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.mollie_payment_id}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleSync(p.mollie_payment_id)}
                          disabled={busyId === p.mollie_payment_id}
                          title="Stiahnuť aktuálny stav z Mollie"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={busyId === p.mollie_payment_id ? 'animate-spin' : ''} /> Sync
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Zatiaľ žiadne pravidelné online dary.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <tr>
                  <th className="text-left px-5 py-3">Darca</th>
                  <th className="text-right px-5 py-3">Suma</th>
                  <th className="text-left px-5 py-3">Interval</th>
                  <th className="text-left px-5 py-3">Stav</th>
                  <th className="text-left px-5 py-3">Začiatok</th>
                  <th className="text-left px-5 py-3">Ďalšia platba</th>
                  <th className="text-left px-5 py-3">Mollie ID</th>
                  <th className="text-right px-5 py-3">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <div className="font-bold text-gray-900">
                        {s.donor_id ? (
                          <Link href={`/admin/darcovia/${s.donor_id}`} className="hover:text-blue-600">
                            {donorLabel(s)}
                          </Link>
                        ) : (
                          donorLabel(s)
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {s.email}
                        {s.mode === 'test' && <span className="ml-2 text-[9px] font-black text-amber-600 uppercase">test</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-black text-gray-900 whitespace-nowrap">
                      {s.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.interval === 'year' ? 'Ročne' : 'Mesačne'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmtDay(s.started_at)}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {s.status === 'cancelled' ? `zrušené ${fmtDay(s.cancelled_at)}` : fmtDay(s.next_payment_at)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.mollie_subscription_id ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {(s.status === 'active' || s.status === 'past_due') && (
                        <button
                          onClick={() => handleCancel(s.id)}
                          disabled={busyId === s.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle size={12} /> Zrušiť
                        </button>
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
