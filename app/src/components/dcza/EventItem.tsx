import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { DioceseEvent } from '@/lib/diocese/public'
import { dayBadge, eventWhen } from '@/lib/diocese/format'

export default function EventItem({ event, past = false }: { event: DioceseEvent; past?: boolean }) {
  const b = dayBadge(event.starts_on)
  return (
    <Link href={`/kalendar/${event.slug}`} className={`group flex gap-4 rounded-2xl p-4 border transition-colors ${past ? 'bg-white/60 border-blue/5 hover:border-blue/20' : 'bg-white border-blue/10 hover:border-gold/60'}`}>
      <div className={`w-14 shrink-0 rounded-xl text-center py-2 ${past ? 'bg-blue-soft/40 text-mute' : 'bg-blue text-white'}`}>
        <span className="block text-xl font-black leading-none">{b.day}</span>
        <span className="block text-[11px] uppercase tracking-wider mt-1">{b.month}</span>
      </div>
      <div className="min-w-0">
        <p className="font-extrabold leading-snug group-hover:text-blue">{event.title}</p>
        <p className="text-sm text-mute mt-0.5">{eventWhen(event)}</p>
        {event.place && (
          <p className="text-sm text-mute inline-flex items-center gap-1 mt-0.5">
            <MapPin size={13} /> {event.place}
          </p>
        )}
      </div>
    </Link>
  )
}
