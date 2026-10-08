'use client'

import { useState } from 'react'
import type { ParishSeason } from '@/lib/parishes/types'
import { DAYS, SERVICE_LABEL } from '@/lib/parishes/types'
import type { PublicSchedule, PublicScheduleItem } from '@/lib/parishes/public'

const SEASON_LABEL: Record<ParishSeason, string> = { regular: 'Cez rok', summer: 'Leto / prázdniny' }

/** „30. minút pred sv. omšou“ → „30 minút pred svätou omšou“ (skratka „sv.“ = svätý, nie svätá omša). */
export function normalizeScheduleNote(s: string | null): string | null {
  if (!s || s.trim() === '-') return null
  return s
    .replace(/(\d+)\.\s*(min|hod)/g, '$1 $2')
    .replace(/sv\.\s?omšou/g, 'svätou omšou')
    .replace(/sv\.\s?omšami/g, 'svätými omšami')
    .replace(/sv\.\s?omše/g, 'svätej omše')
    .replace(/sv\.\s?omša/g, 'svätá omša')
}

function timeText(it: PublicScheduleItem) {
  if (it.time_from && it.time_to) return `${it.time_from} – ${it.time_to}`
  return it.time_from ?? ''
}

/** Jeden deň: svätá omša (časy vedľa seba) a pod ňou ostatné (spovedanie, adorácia…) s jasným označením. */
function DayItems({ items }: { items: PublicScheduleItem[] }) {
  const masses = items.filter((i) => i.service_type === 'mass')
  const others = items.filter((i) => i.service_type !== 'mass')
  return (
    <div className="space-y-1">
      {masses.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {masses.map((it, i) => (
            <span key={i} className="text-sm">
              <span className="font-extrabold text-ink tabular-nums">{timeText(it)}</span>
              {it.place && <span className="text-mute"> {it.place}</span>}
              {it.note && <span className="text-mute text-xs"> ({it.note})</span>}
            </span>
          ))}
        </div>
      )}
      {others.map((it, i) => {
        const rel = normalizeScheduleNote(it.relative_note)
        return (
          <p key={i} className="text-xs text-mute">
            <span className="font-black uppercase tracking-wide text-blue">{SERVICE_LABEL[it.service_type]}:</span>{' '}
            {timeText(it) && <span className="font-bold text-ink tabular-nums">{timeText(it)}</span>}
            {rel && <span>{timeText(it) ? ` (${rel})` : rel}</span>}
            {it.place && <span> · {it.place}</span>}
            {it.note && <span> · {it.note}</span>}
          </p>
        )
      })}
    </div>
  )
}

function byTime(a: PublicScheduleItem, b: PublicScheduleItem) {
  return (a.time_from ?? '99').localeCompare(b.time_from ?? '99')
}

function DayRow({ label, items, highlight }: { label: string; items: PublicScheduleItem[]; highlight?: boolean }) {
  return (
    <div className={`flex gap-4 px-4 py-3 ${highlight ? 'bg-gold/10' : ''}`}>
      <p className={`w-24 shrink-0 text-xs font-black uppercase tracking-widest pt-0.5 ${highlight ? 'text-gold-ink' : 'text-mute'}`}>{label}</p>
      <DayItems items={items} />
    </div>
  )
}

function ScheduleTable({ schedule }: { schedule: PublicSchedule }) {
  const liturgy = schedule.items.filter((i) => i.service_type !== 'office')
  const regular = liturgy.filter((i) => i.occasion === 'regular')
  const firstFriday = liturgy.filter((i) => i.occasion === 'first_friday')
  const days = DAYS.map((d) => ({ ...d, items: regular.filter((i) => i.day_of_week === d.value).sort(byTime) })).filter((d) => d.items.length)
  const other = regular.filter((i) => i.day_of_week == null)
  const labels = [...new Set(other.map((i) => i.day_label ?? ''))]
  const rows = [
    ...days.map((d) => ({ key: `d${d.value}`, label: d.label, items: d.items, highlight: d.value === 0 })),
    ...labels.map((l) => ({ key: `l${l}`, label: l || 'Ďalšie', items: other.filter((i) => (i.day_label ?? '') === l).sort(byTime), highlight: false })),
  ]
  // na počítači dva stĺpce (pondelok–štvrtok | piatok–nedeľa a ďalšie), na mobile jeden
  const half = Math.ceil(rows.length / 2)

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-3">
        {[rows.slice(0, half), rows.slice(half)].filter((c) => c.length).map((col, ci) => (
          <div key={ci} className="rounded-2xl border border-blue/10 bg-white divide-y divide-blue/5 overflow-hidden">
            {col.map((r) => <DayRow key={r.key} label={r.label} items={r.items} highlight={r.highlight} />)}
          </div>
        ))}
      </div>
      {firstFriday.length > 0 && (
        <div className="rounded-2xl border border-blue/10 bg-white overflow-hidden">
          <p className="px-4 pt-3 text-xs font-black uppercase tracking-widest text-blue">Prvý piatok v mesiaci</p>
          <div className="divide-y divide-blue/5">
            {DAYS.map((d) => ({ ...d, items: firstFriday.filter((i) => i.day_of_week === d.value).sort(byTime) }))
              .filter((d) => d.items.length)
              .map((d) => <DayRow key={d.value} label={d.label} items={d.items} />)}
            {firstFriday.some((i) => i.day_of_week == null) && <DayRow label="Ďalšie" items={firstFriday.filter((i) => i.day_of_week == null).sort(byTime)} />}
          </div>
        </div>
      )}
      {schedule.note && <p className="text-sm text-mute">{normalizeScheduleNote(schedule.note)}</p>}
    </div>
  )
}

/** Bohoslužby s prepínačom režimu; aktuálny režim je predvolený a označený. */
export default function ScheduleView({ schedules, current }: { schedules: Partial<Record<ParishSeason, PublicSchedule>>; current: ParishSeason }) {
  const seasons = (['regular', 'summer'] as ParishSeason[]).filter((s) => schedules[s]?.items.some((i) => i.service_type !== 'office'))
  const [season, setSeason] = useState<ParishSeason>(schedules[current] ? current : seasons[0])
  if (!seasons.length) return <p className="text-mute text-sm">Rozpis bohoslužieb zatiaľ nie je zverejnený. Informácie získate na farskom úrade.</p>
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${season === s ? 'bg-gold/15 border-gold text-gold-ink' : 'bg-white border-blue/10 text-ink/85 hover:border-gold/40'}`}
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
