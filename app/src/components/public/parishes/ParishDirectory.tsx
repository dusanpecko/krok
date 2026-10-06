'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Church, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react'
import type { PublicParishListItem } from '@/lib/parishes/public'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Vzdialenosť dvoch bodov v km (haversine). */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const km = (d: number) => `${d.toLocaleString('sk-SK', { maximumFractionDigits: d < 10 ? 1 : 0 })} km`

type Hit = { p: PublicParishListItem; village: string | null; rank: number; distance: number | null }

/**
 * Vyhľadávanie farnosti podľa názvu, obce, filiálky aj patróna (ľudia hľadajú svoju dedinu, nie názov farnosti).
 * Hľadaný text je v adrese (?q=), takže sa dá poslať ďalej a funguje tlačidlo Späť; „Najbližšie ku mne“ zoradí podľa GPS.
 */
export default function ParishDirectory({ parishes, initialQuery = '' }: { parishes: PublicParishListItem[]; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery)
  const [deanery, setDeanery] = useState('')
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const deaneries = useMemo(
    () => [...new Map(parishes.filter((p) => p.deanery_id).map((p) => [p.deanery_id!, p.deanery_name ?? ''])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'sk')),
    [parishes],
  )

  // ?q= v adrese bez novej navigácie (server stránku znova nenačítava)
  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href)
      if (q.trim()) url.searchParams.set('q', q.trim())
      else url.searchParams.delete('q')
      window.history.replaceState(null, '', url)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError('Váš prehliadač nevie zistiť polohu.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError('Polohu sa nepodarilo zistiť. Skúste napísať názov obce.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }

  const tokens = norm(q.trim()).split(/\s+/).filter(Boolean)
  const hits: Hit[] = parishes
    .filter((p) => !deanery || p.deanery_id === deanery)
    .map((p): Hit | null => {
      const distance = here && p.latitude != null && p.longitude != null ? distanceKm(here, { lat: p.latitude, lng: p.longitude }) : null
      if (!tokens.length) return { p, village: null, rank: 0, distance }
      const own = norm(`${p.name} ${p.official_name ?? ''} ${p.city ?? ''}`)
      const hay = `${own} ${norm(p.patrocinium ?? '')} ${p.villages.map(norm).join(' ')}`
      if (!tokens.every((t) => hay.includes(t))) return null
      const phrase = tokens.join(' ')
      // obec, ktorá nie je v názve farnosti – „Obec X patrí do tejto farnosti“
      const village = own.includes(phrase) ? null : p.villages.find((v) => norm(v).includes(phrase)) ?? null
      const starts = (s: string) => s.startsWith(phrase) || s.includes(` ${phrase}`)
      const rank = starts(norm(p.name)) || starts(norm(p.city ?? '')) ? 0 : village && starts(norm(village)) ? 1 : own.includes(phrase) ? 2 : 3
      return { p, village, rank, distance }
    })
    .filter((h): h is Hit => h !== null)
    .sort((a, b) => {
      if (here) return (a.distance ?? Infinity) - (b.distance ?? Infinity)
      return a.rank - b.rank
    })

  if (parishes.length === 0) {
    return <p className="text-center py-24 bg-white border border-blue/10 rounded-3xl text-mute">Stránky farností pripravujeme.</p>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-4">
        <label className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Obec, farnosť alebo patrón…"
            aria-label="Hľadať farnosť"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-blue/15 text-ink placeholder:text-mute/60 focus:outline-none focus:border-gold"
          />
        </label>
        {deaneries.length > 1 && (
          <select value={deanery} onChange={(e) => setDeanery(e.target.value)} aria-label="Dekanát" className="px-4 py-3 rounded-xl bg-white border border-blue/15 text-ink focus:outline-none focus:border-gold">
            <option value="" className="text-ink">Všetky dekanáty</option>
            {deaneries.map(([id, name]) => (
              <option key={id} value={id} className="text-ink">
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10 text-sm">
        {here ? (
          <button type="button" onClick={() => setHere(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gold/40 text-gold-ink font-extrabold hover:bg-gold/10">
            <X size={15} /> Zoradené podľa vzdialenosti od vás
          </button>
        ) : (
          <button type="button" onClick={locate} disabled={locating} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue/15 text-ink/85 font-extrabold hover:border-gold/40 hover:text-gold-bright disabled:opacity-60">
            {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />} Najbližšie ku mne
          </button>
        )}
        {geoError && <span className="text-amber-200/80">{geoError}</span>}
      </div>

      {hits.length === 0 ? (
        <p className="text-center text-mute py-16">Nenašli sme farnosť pre „{q}“. Skúste iný názov obce.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hits.map(({ p, village, distance }) => (
            <Link key={p.slug} href={`/farnosti/${p.slug}`} className="bg-white border border-blue/10 rounded-2xl p-5 hover:border-gold/40 transition-colors group">
              <p className="font-extrabold flex items-start gap-2 group-hover:text-blue">
                <Church size={18} className="text-gold-ink shrink-0 mt-0.5" /> <span className="flex-1">{p.official_name ?? p.name}</span>
                {distance != null && <span className="text-xs font-bold text-blue whitespace-nowrap mt-0.5">{km(distance)}</span>}
              </p>
              {p.patrocinium && <p className="text-sm text-mute mt-1">{p.patrocinium}</p>}
              <p className="text-xs text-mute mt-3 flex flex-wrap gap-x-3">
                {p.deanery_name && <span>Dekanát {p.deanery_name}</span>}
                {p.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {p.city}
                  </span>
                )}
              </p>
              {village && <p className="text-xs text-blue mt-2">Obec {village} patrí do tejto farnosti</p>}
              {!p.has_web && <p className="text-xs text-mute mt-2">Kontakt na farský úrad · rozpis omší zatiaľ nezverejnený</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
