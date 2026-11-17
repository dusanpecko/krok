import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarDays, Lock } from 'lucide-react'
import { dioceseDb } from '@/lib/diocese/public'
import { getRsvp } from '@/lib/diocese/events'
import RsvpForm from '@/components/dcza/RsvpForm'

export const dynamic = 'force-dynamic'

// prihlášky sú na osobný odkaz – vyhľadávače ich nesmú indexovať
export const metadata: Metadata = {
  title: 'Prihláška',
  robots: { index: false, follow: false },
}

/** Prihláška na podujatie z osobného odkazu /podujatia/<slug>?k=<token> (066). */
export default async function EventRsvpPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ k?: string }> }) {
  const [{ slug }, { k }] = await Promise.all([params, searchParams])
  const state = await getRsvp(dioceseDb(), slug, typeof k === 'string' ? k : null)
  if (state.kind === 'not_found') notFound()
  const { event } = state

  return (
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

      {state.kind === 'no_invite' ? (
        <div className="mt-10 rounded-2xl bg-white border border-blue/10 p-6 flex gap-4">
          <Lock className="text-gold-ink shrink-0" />
          <div>
            <p className="font-extrabold">Prihláška je len na osobnú pozvánku.</p>
            <p className="mt-1 text-mute text-sm">Registration is by personal invitation only. Použite, prosím, odkaz z e-mailu alebo QR kód z pozvánky. / Please use the link from your invitation e-mail or the QR code on your invitation.</p>
          </div>
        </div>
      ) : (
        <RsvpForm slug={event.slug} token={k as string} mode={state.mode} event={event} invite={state.invite} response={state.response} />
      )}
    </div>
  )
}
