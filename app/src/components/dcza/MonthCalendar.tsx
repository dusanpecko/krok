'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import type { DioceseEvent } from '@/lib/diocese/public'
import { eventWhen, longDate } from '@/lib/diocese/format'

/** Mesačný kalendár akcií – klik na deň ukáže akcie v ten deň (pripomienky Julie). */

const MONTHS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
const DAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const onDay = (e: DioceseEvent, day: string) => e.starts_on <= day && (e.ends_on ?? e.starts_on) >= day

export default function MonthCalendar({ events, today }: { events: DioceseEvent[]; today: string }) {
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [selected, setSelected] = useState<string>(today)

  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1)
    const lead = (first.getDay() + 6) % 7
    const days = new Date(ym.y, ym.m + 1, 0).getDate()
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)] as (number | null)[]
  }, [ym])

  const move = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }))
  const dayEvents = events.filter((e) => onDay(e, selected))
  const monthCount = events.filter((e) => e.starts_on.slice(0, 7) <= iso(ym.y, ym.m, 1).slice(0, 7) && (e.ends_on ?? e.starts_on).slice(0, 7) >= iso(ym.y, ym.m, 1).slice(0, 7)).length

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
      <div className="rounded-3xl bg-white border border-blue/10 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => move(-1)} aria-label="Predchádzajúci mesiac" className="p-2 rounded-xl hover:bg-blue-soft/40 cursor-pointer">
            <ChevronLeft size={20} />
          </button>
          <p className="text-lg font-extrabold">
            {MONTHS[ym.m]} {ym.y}
            <span className="block text-xs font-bold text-mute text-center">{monthCount ? `${monthCount} akcií` : 'bez akcií'}</span>
          </p>
          <button type="button" onClick={() => move(1)} aria-label="Ďalší mesiac" className="p-2 rounded-xl hover:bg-blue-soft/40 cursor-pointer">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS.map((d) => (
            <div key={d} className="text-[11px] font-black uppercase tracking-wider text-mute py-1">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`x${i}`} />
            const day = iso(ym.y, ym.m, d)
            const count = events.filter((e) => onDay(e, day)).length
            const isSel = day === selected
            const isToday = day === today
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={`relative aspect-square rounded-xl text-sm font-bold flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isSel ? 'bg-blue text-white' : count ? 'bg-blue-soft/50 text-blue hover:bg-blue-soft' : 'text-ink/70 hover:bg-gray-50'
                } ${isToday && !isSel ? 'ring-2 ring-gold' : ''}`}
              >
                {d}
                {count > 0 && <span className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSel ? 'bg-gold-bright' : 'bg-wine'}`} />}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-sm font-black uppercase tracking-wider text-mute mb-3">{longDate(selected)}</p>
        {dayEvents.length === 0 ? (
          <p className="rounded-2xl bg-white border border-blue/10 p-6 text-mute">V tento deň nie sú zverejnené žiadne akcie.</p>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((e) => (
              <Link key={e.id} href={`/kalendar/${e.slug}`} className="block rounded-2xl bg-white border border-blue/10 p-5 hover:border-gold/60 transition-colors">
                <p className="font-extrabold">{e.title}</p>
                <p className="text-sm text-mute mt-0.5">{eventWhen(e)}</p>
                {e.place && (
                  <p className="text-sm text-mute inline-flex items-center gap-1 mt-0.5">
                    <MapPin size={13} /> {e.place}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
