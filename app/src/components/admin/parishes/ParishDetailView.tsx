'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Church } from 'lucide-react'
import { KIND_LABEL, type ParishDetail } from '@/lib/parishes/types'
import ParishBasicTab from './ParishBasicTab'
import ParishVillagesTab from './ParishVillagesTab'
import ParishScheduleTab from './ParishScheduleTab'
import ParishClergyTab from './ParishClergyTab'
import ParishDonationsTab from './ParishDonationsTab'
import ParishAccessTab from './ParishAccessTab'
import type { ChangeRequestRow, ParishAccessRow } from '@/app/admin/farnosti/actions'

type TabKey = 'basic' | 'villages' | 'schedule' | 'clergy' | 'donations' | 'access'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'Základné údaje' },
  { key: 'villages', label: 'Obce a štatistika' },
  { key: 'schedule', label: 'Bohoslužby' },
  { key: 'clergy', label: 'Kňazi' },
  { key: 'donations', label: 'Dary a história' },
  { key: 'access', label: 'Prístupy a návrhy' },
]

export default function ParishDetailView({
  detail,
  deaneries,
  access,
  requests,
}: {
  detail: ParishDetail
  deaneries: { id: string; name: string }[]
  access: ParishAccessRow[]
  requests: ChangeRequestRow[]
}) {
  const [tab, setTab] = useState<TabKey>('basic')
  const { parish } = detail
  const catholics = detail.villages.reduce((a, v) => a + (v.catholics ?? 0), 0)
  const thisYear = detail.summary.find((s) => s.year === new Date().getFullYear())

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/farnosti" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Všetky farnosti
      </Link>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Church className="w-7 h-7 text-blue-600" />
            {parish.official_name ?? parish.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3">
            <span>{KIND_LABEL[parish.kind]}</span>
            {parish.parish_code && <span className="font-mono">kód {parish.parish_code}</span>}
            {parish.administrator_name && <span>{parish.administrator_name}</span>}
            {!parish.is_active && <span className="font-bold text-red-500">neaktívna</span>}
            {parish.schematizmus_url && (
              <a href={parish.schematizmus_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                schematizmus <ExternalLink size={12} />
              </a>
            )}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <Stat label="Katolíci" value={catholics ? catholics.toLocaleString('sk-SK') : '—'} />
          <Stat label="Darcovia" value={String(detail.donorsCount)} />
          <Stat label={`Vybrané ${new Date().getFullYear()}`} value={thisYear ? thisYear.collected_amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'} />
        </div>
      </div>

      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            {t.label}
            {t.key === 'access' && requests.some((r) => r.status === 'pending') && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-white text-[10px]">{requests.filter((r) => r.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'basic' && <ParishBasicTab parish={parish} deaneries={deaneries} />}
      {tab === 'villages' && <ParishVillagesTab parishId={parish.id} initial={detail.villages} />}
      {tab === 'schedule' && <ParishScheduleTab parishId={parish.id} schedules={detail.schedules} villages={detail.villages} />}
      {tab === 'clergy' && <ParishClergyTab parishId={parish.id} initial={detail.clergy} />}
      {tab === 'donations' && <ParishDonationsTab summary={detail.summary} log={detail.log} donorsCount={detail.donorsCount} />}
      {tab === 'access' && <ParishAccessTab parishId={parish.id} access={access} requests={requests} defaultEmail={parish.email} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</div>
      <div className="text-lg font-black text-gray-900">{value}</div>
    </div>
  )
}
