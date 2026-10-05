'use client'

import { useState } from 'react'
import type { ParishSeason } from '@/lib/parishes/types'
import { DAYS, SERVICE_LABEL } from '@/lib/parishes/types'
import type { PublicSchedule, PublicScheduleItem } from '@/lib/parishes/public'

const SEASON_LABEL: Record<ParishSeason, string> = { regular: 'Cez rok', summer: 'Leto / prázdniny' }

function timeText(it: PublicScheduleItem) {
  if (it.time_from && it.time_to) return `${it.time_from} – ${it.time_to}`
  return it.time_from ?? it.relative_note ?? ''
}

/** Riadky jedného dňa: čas, druh (ak nie je omša), miesto, poznámka. */
function Rows({ items }: { items: PublicScheduleItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-extrabold text-white tabular-nums">{timeText(it)}</span>
          {it.service_type !== 'mass' && <span className="text-gold-bright text-xs font-black uppercase tracking-wide">{SERVICE_LABEL[it.service_type]}</span>}
          {it.time_from && it.relative_note && <span className="text-blue-100/60 text-xs">({it.relative_note})</span>}
          {it.place && <span className="text-blue-100/70">{it.place}</span>}
          {it.note && <span className="text-blue-100/50 text-xs">{it.note}</span>}
        </li>
      ))}
    </ul>
  )
}

function byTime(a: PublicScheduleItem, b: PublicScheduleItem) {
  return (a.time_from ?? '99').localeCompare(b.time_from ?? '99')
}

function ScheduleTable({ schedule }: { schedule: PublicSchedule }) {
  const liturgy = schedule.items.filter((i) => i.service_type !== 'office')
  const regular = liturgy.filter((i) => i.occasion === 'regular')
  const firstFriday = liturgy.filter((i) => i.occasion === 'first_friday')
  const days = DAYS.map((d) => ({ ...d, items: regular.filter((i) => i.day_of_week === d.value).sort(byTime) })).filter((d) => d.items.length)
  const other = regular.filter((i) => i.day_of_week == null)
  const labels = [...new Set(other.map((i) => i.day_label ?? ''))]

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {days.map((d) => (
          <div key={d.value} className={`p-4 rounded-2xl border ${d.value === 0 ? 'bg-gold/10 border-gold/30' : 'bg-white/[0.04] border-white/10'}`}>
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${d.value === 0 ? 'text-gold-bright' : 'text-blue-100/60'}`}>{d.label}</p>
            <Rows items={d.items} />
          </div>
        ))}
        {labels.map((l) => (
          <div key={l} className="p-4 rounded-2xl border bg-white/[0.04] border-white/10">
            <p className="text-xs font-black uppercase tracking-widest mb-2 text-blue-100/60">{l || 'Ďalšie'}</p>
            <Rows items={other.filter((i) => (i.day_label ?? '') === l).sort(byTime)} />
          </div>
        ))}
      </div>
      {firstFriday.length > 0 && (
        <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.04]">
          <p className="text-xs font-black uppercase tracking-widest mb-3 text-gold-bright">Prvý piatok v mesiaci</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {DAYS.map((d) => ({ ...d, items: firstFriday.filter((i) => i.day_of_week === d.value).sort(byTime) }))
              .filter((d) => d.items.length)
              .map((d) => (
                <div key={d.value}>
                  <p className="text-xs font-bold text-blue-100/60 mb-1">{d.label}</p>
                  <Rows items={d.items} />
                </div>
              ))}
            {firstFriday.some((i) => i.day_of_week == null) && <Rows items={firstFriday.filter((i) => i.day_of_week == null).sort(byTime)} />}
          </div>
        </div>
      )}
      {schedule.note && <p className="text-sm text-blue-100/60">{schedule.note}</p>}
    </div>
  )
}

/** Bohoslužby s prepínačom režimu; aktuálny režim je predvolený a označený. */
export default function ScheduleView({ schedules, current }: { schedules: Partial<Record<ParishSeason, PublicSchedule>>; current: ParishSeason }) {
  const seasons = (['regular', 'summer'] as ParishSeason[]).filter((s) => schedules[s]?.items.some((i) => i.service_type !== 'office'))
  const [season, setSeason] = useState<ParishSeason>(schedules[current] ? current : seasons[0])
  if (!seasons.length) return <p className="text-blue-100/60 text-sm">Rozpis bohoslužieb zatiaľ nie je zverejnený. Informácie získate na farskom úrade.</p>
  const sched = schedules[seasons.includes(season) ? season : seasons[0]]!

  return (
    <div>
      {seasons.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {seasons.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeason(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${season === s ? 'bg-gold/15 border-gold text-gold-bright' : 'bg-white/5 border-white/10 text-blue-50 hover:border-gold/40'}`}
            >
              {SEASON_LABEL[s]}
              {s === current && <span className="ml-1.5 text-[10px] uppercase tracking-wider opacity-80">• teraz</span>}
            </button>
          ))}
        </div>
      )}
      <ScheduleTable schedule={sched} />
    </div>
  )
}
