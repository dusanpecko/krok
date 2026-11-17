import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Eye } from 'lucide-react'
import { adminLoadEvent } from '../../actions'
import { isEventOpen } from '@/lib/diocese/events'
import RsvpForm from '@/components/dcza/RsvpForm'

export const dynamic = 'force-dynamic'

/** Náhľad prihlášky pre admina – vyzerá ako na dcza.sk, ale nič sa neukladá ani neposiela. */
export default async function EventPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ qr?: string }> }) {
  const [{ id }, { qr }] = await Promise.all([params, searchParams])
  const data = await adminLoadEvent(id)
  if (!data) notFound()
  const e = data.event
  const event = { slug: e.slug, title: e.title, event_when: e.event_when, intro: e.intro, thanks_text: e.thanks_text, questions: e.questions, open: isEventOpen(e) }
  const mode = qr ? 'public' : 'invite'

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-bold text-amber-800">
          <Eye size={16} /> Náhľad prihlášky – odpoveď sa neuloží a e-mail sa nepošle.
        </span>
        <span className="flex flex-wrap gap-4">
          <Link href={`?`} className={`font-bold ${mode === 'invite' ? 'text-gray-900' : 'text-blue-600 hover:underline'}`}>Osobná pozvánka (e-mail)</Link>
          <Link href={`?qr=1`} className={`font-bold ${mode === 'public' ? 'text-gray-900' : 'text-blue-600 hover:underline'}`}>Pozvánka poštou (QR)</Link>
          <Link href={`/admin/web-dieceza/podujatia/${id}`} className="inline-flex items-center gap-1 font-bold text-gray-500 hover:text-blue-600">
            <ArrowLeft size={14} /> Späť
          </Link>
        </span>
      </div>

      <div className="bg-paper-warm rounded-3xl text-ink">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <p className="text-[11px] font-black uppercase tracking-widest text-gold-ink">Pozvánka / Invitation</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-light tracking-tight leading-tight">{event.title}</h1>
          {event.event_when && (
            <p className="mt-4 flex items-start gap-2 text-lg text-ink/85">
              <CalendarDays size={20} className="text-gold-ink shrink-0 mt-1" /> {event.event_when}
            </p>
          )}
          {event.intro && (
            <div className="mt-6 text-[15px] leading-relaxed text-ink/90 space-y-2">
              {event.intro.split('\n').map((l, i) => (l.trim() ? <p key={i}>{l}</p> : null))}
            </div>
          )}
          <RsvpForm
            key={mode}
            slug={event.slug}
            token=""
            mode={mode}
            preview
            event={event}
            invite={mode === 'invite' ? { first_name: 'Ján', last_name: 'Vzorový', email: 'jan.vzorovy@example.sk' } : { first_name: '', last_name: '', email: '' }}
            response={null}
          />
        </div>
      </div>
    </div>
  )
}
