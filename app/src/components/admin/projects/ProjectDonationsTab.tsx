'use client'

import { Coins, Users, CreditCard, Repeat, Landmark } from 'lucide-react'
import { formatDate, formatEur, type ProjectDonationsData, type ProjectStats } from '@/lib/projects/types'
import { SectionTitle, cardCls } from './ui'

const PAYMENT_METHOD: Record<string, string> = {
  bank_transfer: 'Prevod',
  card_online: 'Karta (Mollie)',
  cash: 'Hotovosť',
  postal_order: 'Poštová poukážka',
}

const PAYMENT_STATUS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  pending: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-50 text-red-700',
  canceled: 'bg-gray-100 text-gray-600',
  expired: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-600',
  activating: 'bg-blue-50 text-blue-700',
}

const KIND_LABEL: Record<string, string> = {
  one_time: 'Jednorazový',
  recurring_first: 'Prvá platba predplatného',
  recurring: 'Pravidelná platba',
}

function Badge({ value }: { value: string }) {
  return <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${PAYMENT_STATUS[value] ?? 'bg-gray-100 text-gray-600'}`}>{value}</span>
}

export default function ProjectDonationsTab({ stats, data }: { stats: ProjectStats; data: ProjectDonationsData }) {
  const { donations, payments, subscriptions } = data
  const activeSubs = subscriptions.filter((s) => s.status === 'active' || s.status === 'past_due')
  const monthly = activeSubs.reduce((acc, s) => acc + (s.interval === 'year' ? s.amount / 12 : s.amount), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Coins size={18} />} label="Vyzbierané spolu" value={formatEur(stats.collected_amount)} />
        <Stat icon={<Users size={18} />} label="Darcov" value={String(stats.supporters_count)} />
        <Stat icon={<Landmark size={18} />} label="Darov v Kroku" value={String(stats.donations_count)} />
        <Stat icon={<Repeat size={18} />} label="Pravidelne mesačne" value={formatEur(monthly)} hint={`${activeSubs.length} aktívnych predplatných`} />
      </div>

      <div className={`${cardCls} space-y-4`}>
        <SectionTitle title={`Dary (${donations.length})`} description="Priradené dary z banky aj z Mollie. Na túto sumu sa počíta živé počítadlo (plus stav pred migráciou)." />
        {donations.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">Zatiaľ žiadne dary priradené k tejto výzve.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4">Dátum</th>
                  <th className="py-2 pr-4">Darca</th>
                  <th className="py-2 pr-4">VS</th>
                  <th className="py-2 pr-4">Spôsob</th>
                  <th className="py-2 text-right">Suma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 pr-4 text-gray-500">{formatDate(d.donation_date)}</td>
                    <td className="py-2.5 pr-4 font-bold text-gray-900">{d.donor_name}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{d.variable_symbol ?? '–'}</td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{PAYMENT_METHOD[d.payment_method] ?? d.payment_method}</td>
                    <td className="py-2.5 text-right font-black text-gray-900">{formatEur(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${cardCls} space-y-4`}>
        <SectionTitle title={`Pravidelné dary cez Mollie (${subscriptions.length})`} description="Predplatné viazané na túto výzvu. Darca môže mať zároveň iné predplatné na fond alebo inú výzvu." />
        {subscriptions.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">Žiadne predplatné.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4">Darca</th>
                  <th className="py-2 pr-4">Stav</th>
                  <th className="py-2 pr-4">Interval</th>
                  <th className="py-2 pr-4">Ďalšia platba</th>
                  <th className="py-2 text-right">Suma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-4">
                      <span className="font-bold text-gray-900 block">{s.donor_name || '–'}</span>
                      <span className="text-xs text-gray-400">{s.email}</span>
                    </td>
                    <td className="py-2.5 pr-4"><Badge value={s.status} /></td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{s.interval === 'year' ? 'ročne' : 'mesačne'}</td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{formatDate(s.next_payment_at)}</td>
                    <td className="py-2.5 text-right font-black text-gray-900">{formatEur(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${cardCls} space-y-4`}>
        <SectionTitle title={`Online platby Mollie (${payments.length})`} description="Všetky pokusy o platbu vrátane nedokončených. Zaplatené sa objavia aj v zozname darov vyššie." />
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">Žiadne online platby.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4">Vytvorená</th>
                  <th className="py-2 pr-4">Platca</th>
                  <th className="py-2 pr-4">Typ</th>
                  <th className="py-2 pr-4">Stav</th>
                  <th className="py-2 pr-4">Metóda</th>
                  <th className="py-2 text-right">Suma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                    <td className="py-2.5 pr-4">
                      <span className="font-bold text-gray-900 block">{p.donor_name || '–'}</span>
                      <span className="text-xs text-gray-400">{p.email}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{KIND_LABEL[p.kind] ?? p.kind}</td>
                    <td className="py-2.5 pr-4"><Badge value={p.status} /></td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs flex items-center gap-1"><CreditCard size={12} /> {p.method ?? '–'}</td>
                    <td className="py-2.5 text-right font-black text-gray-900">{formatEur(p.amount)}</td>
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

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className={`${cardCls} p-5`}>
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider"><span className="text-blue-500">{icon}</span> {label}</div>
      <div className="text-2xl font-black text-gray-900 mt-2">{value}</div>
      {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  )
}
