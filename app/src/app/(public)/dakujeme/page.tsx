'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Heart, Loader2, AlertCircle, ArrowRight, User, RefreshCw } from 'lucide-react'
import { getOnlinePaymentStatus, type OnlinePaymentStatus } from '../platby/actions'

/**
 * Návrat z platobnej brány Mollie. Mollie má JEDEN redirectUrl pre úspech
 * aj zrušenie, takže návrat nie je dôkazom zaplatenia – stav overujeme na
 * serveri (a krátko pollujeme, kým Mollie platbu potvrdí).
 */

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 20

function formatEur(amount: number) {
  return amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })
}

function ThankYouContent() {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') ?? ''
  // Bez referencie nie je čo overovať – stav je známy hned pri prvom renderi
  const [state, setState] = useState<OnlinePaymentStatus | null>(() => (ref ? null : { found: false }))
  const [polls, setPolls] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!ref) return
    let cancelled = false

    async function check(attempt: number) {
      const result = await getOnlinePaymentStatus(ref)
      if (cancelled) return
      setState(result)
      setPolls(attempt)
      const pending = result.found && !result.isPaid && !result.isFailed
      if (pending && attempt < MAX_POLLS) {
        timer.current = setTimeout(() => check(attempt + 1), POLL_INTERVAL_MS)
      }
    }
    check(1)

    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [ref])

  const loading = state === null
  const notFound = state?.found === false
  const paid = state?.found && state.isPaid
  const failed = state?.found && state.isFailed
  const pending = state?.found && !state.isPaid && !state.isFailed
  const timedOut = pending && polls >= MAX_POLLS
  const recurring = state?.found && state.kind !== 'one_time'
  const projectSlug = state?.found ? state.projectSlug : null
  const projectName = state?.found ? state.projectName : null
  const backHref = projectSlug ? `/vyzvy/${projectSlug}` : failed ? '/#dar' : '/'

  return (
    <div className="relative -mt-24 lg:-mt-32 min-h-screen bg-blue-deep text-white flex items-center justify-center px-4 py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(9,80,150,0.35),_transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        {loading && (
          <>
            <Loader2 size={48} className="mx-auto text-gold-bright animate-spin" />
            <h1 className="text-2xl font-extrabold">Overujeme vašu platbu…</h1>
          </>
        )}

        {!loading && notFound && (
          <>
            <AlertCircle size={48} className="mx-auto text-zinc-400" />
            <h1 className="text-2xl font-extrabold">Platbu sme nenašli</h1>
            <p className="text-zinc-300 text-sm leading-relaxed font-light">
              Odkaz je neplatný alebo už neplatí. Ak ste platbu odoslali, nájdete ju vo svojom profile
              v časti Moje dary.
            </p>
          </>
        )}

        {!loading && paid && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
              <Heart size={36} className="text-gold-bright fill-gold-bright" />
            </div>
            <h1 className="text-3xl font-extrabold">Ďakujeme za váš KROK</h1>
            <p className="text-zinc-300 text-sm leading-relaxed font-light">
              {recurring ? (
                <>
                  Váš pravidelný dar vo výške <strong className="text-white">{formatEur(state.amount)}</strong>
                  {state.interval === 'year' ? ' ročne' : ' mesačne'} je nastavený. Prvú platbu sme prijali,
                  ďalšie sa budú sťahovať automaticky. Pravidelný dar môžete kedykoľvek zrušiť vo svojom profile.
                </>
              ) : (
                <>
                  Váš dar vo výške <strong className="text-white">{formatEur(state.amount)}</strong> sme prijali.
                  Vďaka vám môže pastoračná služba v našej diecéze rásť.
                </>
              )}
            </p>
            {projectName && (
              <p className="text-sm text-gold-bright font-bold">
                Dar je určený na výzvu „{projectName}“.
              </p>
            )}
          </>
        )}

        {!loading && pending && !timedOut && (
          <>
            <Loader2 size={48} className="mx-auto text-gold-bright animate-spin" />
            <h1 className="text-2xl font-extrabold">Čakáme na potvrdenie platby</h1>
            <p className="text-zinc-300 text-sm leading-relaxed font-light">
              Banka platbu ešte spracúva. Stránka sa obnoví automaticky, prosím neodchádzajte.
            </p>
          </>
        )}

        {!loading && timedOut && (
          <>
            <RefreshCw size={48} className="mx-auto text-zinc-400" />
            <h1 className="text-2xl font-extrabold">Platba ešte nie je potvrdená</h1>
            <p className="text-zinc-300 text-sm leading-relaxed font-light">
              Potvrdenie od banky mešká. Ak ste platbu dokončili, zaznamená sa automaticky, len čo ju
              banka potvrdí – skontrolujte neskôr časť Moje dary vo svojom profile.
            </p>
          </>
        )}

        {!loading && failed && (
          <>
            <AlertCircle size={48} className="mx-auto text-vermilion" />
            <h1 className="text-2xl font-extrabold">Platba neprebehla</h1>
            <p className="text-zinc-300 text-sm leading-relaxed font-light">
              Platba bola zrušená alebo ju banka odmietla. Z vášho účtu sa nič nestrhlo. Môžete to skúsiť
              znova alebo použiť bankový prevod.
            </p>
          </>
        )}

        {!loading && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold rounded-2xl text-sm shadow-xl hover:shadow-gold/20 transition-all"
            >
              {failed ? 'Skúsiť znova' : projectSlug ? 'Späť na výzvu' : 'Späť na hlavnú stránku'} <ArrowRight size={16} />
            </Link>
            <Link
              href="/profil#dary"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/10 text-white font-bold rounded-2xl text-sm hover:bg-white/20 transition-all"
            >
              <User size={16} /> Môj profil
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="relative -mt-24 lg:-mt-32 min-h-screen bg-blue-deep flex items-center justify-center">
          <Loader2 size={48} className="text-gold-bright animate-spin" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  )
}
