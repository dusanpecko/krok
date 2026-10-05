import { Clock } from 'lucide-react'
import { DAYS } from '@/lib/parishes/types'
import type { PublicParish, PublicScheduleItem } from '@/lib/parishes/public'
import { officeHoursFor } from '@/lib/parishes/format'

const time = (i: PublicScheduleItem) => (i.time_from && i.time_to ? `${i.time_from} – ${i.time_to}` : i.time_from ?? i.relative_note ?? '')

/** Úradné hodiny farskej kancelárie (aktuálny režim, inak „cez rok“). */
export default function OfficeHours({ parish }: { parish: PublicParish }) {
  const { items, season } = officeHoursFor(parish)
  if (!items.length) return null
  const days = DAYS.map((d) => ({ ...d, items: items.filter((i) => i.day_of_week === d.value) })).filter((d) => d.items.length)
  const other = items.filter((i) => i.day_of_week == null)
  return (
    <div className="pt-4 border-t border-white/10">
      <p className="text-xs font-black uppercase tracking-widest text-blue-100/60 mb-2 flex items-center gap-2">
        <Clock size={14} className="text-gold" /> Úradné hodiny{season === 'summer' ? ' (leto)' : ''}
      </p>
      <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {days.map((d) => (
          <div key={d.value} className="contents">
            <dt className="text-blue-100/70">{d.label}</dt>
            <dd className="font-bold">
              {d.items.map((i, k) => (
                <span key={k} className="block">
                  {time(i)}
                  {i.note && <span className="font-normal text-blue-100/60"> · {i.note}</span>}
                </span>
              ))}
            </dd>
          </div>
        ))}
        {other.map((i, k) => (
          <div key={`o${k}`} className="contents">
            <dt className="text-blue-100/70">{i.day_label}</dt>
            <dd className="font-bold">
              {time(i)}
              {i.note && <span className="font-normal text-blue-100/60"> · {i.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
