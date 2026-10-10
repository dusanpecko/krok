'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, BookOpen, Pause, Play } from 'lucide-react'

/** Verejné API lectio.one (CORS otvorený, cache 5 min). */
const LECTIO_API_URL = process.env.NEXT_PUBLIC_LECTIO_API_URL || 'https://www.lectio.one/api/public/lectio/today'

type LectioToday = {
  date: string
  lang: string
  day: { title: string; rank: string; colour: string; season: string } | null
  lectio: {
    reference: string
    title: string
    scripture: string
    preview: string
    actio: string
    audio_url: string | null
  } | null
  url: string
}

/** Mobilná aplikácia Lectio Divina (odkazy z lectio.one). */
const APP_STORE_URL = 'https://apps.apple.com/sk/app/lectio-divina/id6443882687'
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=sk.dpapp.app.android604688a88a394'

type Variant = 'krok' | 'dcza'

/** Štýly podľa webu: KROK (mojkrok.sk) alebo web diecézy (dcza.sk). */
const VARIANTS = {
  krok: {
    section: 'py-28 md:py-36 bg-white border-t border-blue/10',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    heading: 'mb-12',
    kicker: 'flex items-center gap-3 text-blue uppercase tracking-widest text-xs font-extrabold mb-4',
    title: 'text-3xl md:text-4xl lg:text-5xl font-light text-ink leading-tight',
    subtitle: 'text-ink/80 text-base md:text-lg font-light leading-relaxed mt-4',
  },
  dcza: {
    section: 'py-16 bg-white border-b border-blue/10',
    container: 'max-w-7xl mx-auto px-4 sm:px-6',
    heading: 'mb-8',
    kicker: 'text-xs font-black uppercase tracking-[0.2em] text-wine mb-2',
    title: 'text-3xl font-light tracking-tight',
    subtitle: 'text-mute mt-3 leading-relaxed',
  },
} satisfies Record<Variant, Record<string, string>>

/** Liturgické farby → farba bodky. */
const LITURGICAL_COLOURS: Record<string, string> = {
  green: '#2f7d32',
  white: '#ffffff',
  red: '#C8332E',
  violet: '#6b3fa0',
  rose: '#e48aa8',
  black: '#1a1a1a',
  gold: '#CBBB2D',
}

/** „2026-10-09“ → „Piatok 9. októbra 2026“ (lokálny dátum, bez posunu cez UTC). */
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const text = new Date(y, m - 1, d).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Sekcia „Lectio Divina na dnes“ na domovskej stránke KROK aj diecézy. Dáta ťahá
 * z verejného API lectio.one až na klientovi (source = variant, kvôli UTM).
 * Kým sa načítava, ukáže skeleton; ak API zlyhá alebo lectio chýba, nevykreslí nič.
 */
export default function LectioTodaySection({ variant = 'krok' }: { variant?: Variant }) {
  // undefined = načítava sa, null = skryť sekciu
  const [data, setData] = useState<LectioToday | null | undefined>(undefined)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let cancelled = false
    const url = new URL(LECTIO_API_URL)
    url.searchParams.set('lang', 'sk')
    url.searchParams.set('source', variant)
    fetch(url)
      .then((res) => (res.ok ? (res.json() as Promise<LectioToday>) : null))
      .then((json) => {
        if (!cancelled) setData(json?.lectio ? json : null)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [variant])

  if (data === null) return null
  if (data === undefined) return <LectioTodaySkeleton variant={variant} />

  const lectio = data.lectio!
  const dotColour = data.day ? LITURGICAL_COLOURS[data.day.colour] : undefined

  const toggleAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }

  return (
    <section id="lectio" className={`relative overflow-hidden ${VARIANTS[variant].section}`}>
      {variant === 'krok' && <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold/5 blur-[120px] pointer-events-none rounded-full" />}
      <div className={`relative ${VARIANTS[variant].container}`}>
        <SectionHeading variant={variant} url={data.url} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Evanjelium dňa */}
          <article className="lg:col-span-7 rounded-3xl bg-paper-warm border border-blue/10 p-6 sm:p-8 md:p-10 shadow-sm">
            <p className="text-sm text-mute font-semibold">{formatDate(data.date)}</p>
            {data.day && (
              <p className="mt-1 flex items-center gap-2.5 text-ink font-extrabold">
                {dotColour && (
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0 ring-1 ring-ink/20"
                    style={{ backgroundColor: dotColour }}
                    aria-hidden
                  />
                )}
                {data.day.title}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-2xl md:text-3xl font-light text-blue">
                <BookOpen size={24} className="text-gold-ink shrink-0" />
                {lectio.reference}
              </p>
              {lectio.audio_url && (
                <>
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue text-white text-sm font-extrabold hover:bg-blue/90 transition-colors cursor-pointer"
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                    {playing ? 'Pozastaviť' : 'Vypočuť'}
                  </button>
                  <audio
                    ref={audioRef}
                    src={lectio.audio_url}
                    preload="none"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                  />
                </>
              )}
            </div>

            <p className="mt-5 text-ink/85 text-base md:text-lg leading-relaxed whitespace-pre-line line-clamp-10">{lectio.scripture}</p>
            <p className="mt-4 text-xs text-mute uppercase tracking-widest font-extrabold">{lectio.title}</p>
          </article>

          {/* Rozjímanie a predsavzatie */}
          <div className="lg:col-span-5 space-y-8">
            <div className="border-l-4 border-gold pl-6">
              <p className="text-xs text-mute uppercase tracking-widest font-extrabold mb-3">Lectio</p>
              <p className="text-ink/85 leading-relaxed">{lectio.preview}</p>
            </div>

            {lectio.actio && (
              <blockquote className="p-6 rounded-2xl bg-blue-soft/40 border border-blue/10">
                <p className="text-xs text-mute uppercase tracking-widest font-extrabold mb-2">Actio</p>
                <p className="text-xl md:text-2xl font-light italic text-ink leading-snug">„{lectio.actio}“</p>
              </blockquote>
            )}

            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue to-blue-deep text-white rounded-xl font-extrabold shadow-lg hover:shadow-blue/30 hover:gap-3 transition-all"
            >
              Celé Lectio Divina na lectio.one <ArrowRight size={16} />
            </a>

            <AppBadges />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Odkazy na stiahnutie aplikácie pre iOS a Android. */
function AppBadges() {
  const stores = [
    {
      href: APP_STORE_URL,
      small: 'Stiahnuť v',
      label: 'App Store',
      icon: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
    },
    {
      href: GOOGLE_PLAY_URL,
      small: 'Získať na',
      label: 'Google Play',
      icon: 'M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z',
    },
  ]
  return (
    <div className="pt-2">
      <p className="text-xs text-mute uppercase tracking-widest font-extrabold mb-3">Lectio Divina aj v mobile</p>
      <div className="flex flex-wrap gap-3">
        {stores.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 pl-4 pr-5 py-2.5 rounded-xl bg-ink text-white hover:bg-blue-deep transition-colors"
          >
            <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden>
              <path d={s.icon} />
            </svg>
            <span className="leading-tight">
              <span className="block text-[10px] uppercase tracking-wider opacity-80">{s.small}</span>
              <span className="block text-base font-extrabold">{s.label}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

/** Hlavička sekcie; logo lectio.one vpravo (v skeletone bez odkazu). */
function SectionHeading({ variant, url }: { variant: Variant; url?: string }) {
  const v = VARIANTS[variant]
  const logo = (
    <Image src="/lectio/lectio_logo_color.webp" alt="lectio.one" width={800} height={145} className="h-8 md:h-10 w-auto" />
  )
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${v.heading}`}>
      <div className="max-w-3xl">
        <div className={v.kicker}>
          {variant === 'krok' && <span className="w-8 h-[2px] bg-gold rounded-full" />}
          <span>Lectio Divina na dnes</span>
        </div>
        <h2 className={v.title}>Zastavte sa pri Božom slove</h2>
        <p className={v.subtitle}>
          Každý deň nové evanjelium a rozjímanie z projektu lectio.one, ktorý podporuje aj KROK.
        </p>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-90 hover:opacity-100 transition-opacity">
          {logo}
        </a>
      ) : (
        <div className="shrink-0 opacity-90">{logo}</div>
      )}
    </div>
  )
}

function LectioTodaySkeleton({ variant }: { variant: Variant }) {
  return (
    <section className={`relative ${VARIANTS[variant].section}`} aria-busy="true" aria-label="Načítava sa Lectio Divina na dnes">
      <div className={VARIANTS[variant].container}>
        <SectionHeading variant={variant} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start animate-pulse">
          <div className="lg:col-span-7 rounded-3xl bg-paper-warm border border-blue/10 p-6 sm:p-8 md:p-10 space-y-4">
            <div className="h-4 w-48 rounded bg-blue/10" />
            <div className="h-5 w-72 max-w-full rounded bg-blue/10" />
            <div className="h-8 w-40 rounded bg-blue/10 mt-6" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-4 rounded bg-blue/10 ${i === 7 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="border-l-4 border-gold/40 pl-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`h-4 rounded bg-blue/10 ${i === 4 ? 'w-1/2' : 'w-full'}`} />
              ))}
            </div>
            <div className="h-24 rounded-2xl bg-blue-soft/60" />
            <div className="h-12 w-72 max-w-full rounded-2xl bg-blue/10" />
            <div className="flex gap-3">
              <div className="h-12 w-36 rounded-xl bg-blue/10" />
              <div className="h-12 w-36 rounded-xl bg-blue/10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
