import { CalendarClock } from 'lucide-react'
import { DAYS } from '@/lib/parishes/types'
import type { PublicParish, PublicScheduleItem } from '@/lib/parishes/public'
import { officeHoursFor } from '@/lib/parishes/format'
import { SectionHeading } from './Shell'

const time = (i: PublicScheduleItem) => (i.time_from && i.time_to ? `${i.time_from} – ${i.time_to}` : i.time_from ?? i.relative_note ?? '')

function Rows({ items }: { items: PublicScheduleItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((i, k) => (
        <li key={k} className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-extrabold text-white tabular-nums">{time(i)}</span>
          {i.note && <span className="text-blue-100/60">{i.note}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Úradné hodiny farskej kancelárie – samostatná sekcia v štýle bohoslužieb (aktuálny režim, inak „cez rok“). */
export default function OfficeHours({ parish }: { parish: PublicParish }) {
  const { items, season } = officeHoursFor(parish)
  if (!items.length) return null
  const days = DAYS.map((d) => ({ ...d, items: items.filter((i) => i.day_of_week === d.value) })).filter((d) => d.items.length)
  const other = items.filter((i) => i.day_of_week == null)
  const labels = [...new Set(other.map((i) => i.day_label ?? ''))]
  return (
    <section className="mb-16">
      <SectionHeading id="uradne-hodiny" icon={<CalendarClock size={22} />}>
        Úradné hodiny{season === 'summer' ? ' (leto)' : ''}
      </SectionHeading>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {days.map((d) => (
          <div key={d.value} className="p-4 rounded-2xl border bg-white/[0.04] border-white/10">
            <p className="text-xs font-black uppercase tracking-widest mb-2 text-blue-100/60">{d.label}</p>
            <Rows items={d.items} />
          </div>
        ))}
        {labels.map((l) => (
          <div key={l} className="p-4 rounded-2xl border bg-white/[0.04] border-white/10">
            <p className="text-xs font-black uppercase tracking-widest mb-2 text-blue-100/60">{l || 'Ďalšie'}</p>
            <Rows items={other.filter((i) => (i.day_label ?? '') === l)} />
          </div>
        ))}
      </div>
    </section>
  )
}
