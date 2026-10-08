import type { Metadata } from 'next'
import { getPastEvents, getUpcomingEvents } from '@/lib/diocese/public'
import EventItem from '@/components/dcza/EventItem'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kalendár akcií' }

export default async function DczaCalendar() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(50), getPastEvents(24)])
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Žilinská diecéza</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-10">Kalendár akcií</h1>
      <h2 className="text-xl font-light mb-4">Pripravujeme</h2>
      {upcoming.length ? (
        <div className="grid md:grid-cols-2 gap-3 mb-12">
          {upcoming.map((e) => (
            <EventItem key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white border border-blue/10 p-6 text-mute mb-12">Momentálne nie sú zverejnené žiadne pripravované akcie.</p>
      )}
      {past.length > 0 && (
        <>
          <h2 className="text-xl font-light mb-4">Už sme zažili</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {past.map((e) => (
              <EventItem key={e.id} event={e} past />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
