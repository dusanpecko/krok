'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, X } from 'lucide-react'
import type { KrokAnnouncementData } from '@/lib/krok/announcement'

const STORAGE_PREFIX = 'krok_announcement_'

/** Okno s krátkym oznámením na mojkrok.sk (logo + správa + tlačidlo). Zatvorenie si pamätá v prehliadači. Obdoba DczaAnnouncement. */
export default function KrokAnnouncement({ announcement }: { announcement: KrokAnnouncementData }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const key = STORAGE_PREFIX + announcement.id
  const external = /^https?:\/\//.test(announcement.href)

  const close = useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(key, '1')
    } catch {}
  }, [key])

  useEffect(() => {
    // ?oznamenie – zobrazí okno vždy (kontrola textu, aj po zatvorení)
    const force = new URLSearchParams(window.location.search).has('oznamenie')
    if (!force) {
      if (new Date().toISOString().slice(0, 10) > announcement.until) return
      if (!external && pathname?.endsWith(announcement.href)) return // na samotnej stránke nie
      try {
        if (localStorage.getItem(key)) return
      } catch {}
    }
    // krátke oneskorenie – stránka sa najprv vykreslí, potom sa okno zobrazí
    const t = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(t)
  }, [announcement, key, pathname, external])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null
  const btnCls =
    'mt-6 inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-2xl bg-blue text-white font-extrabold hover:bg-blue-deep transition-colors'
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-deep/70 backdrop-blur-sm print:hidden" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="krok-announcement-title"
        className="relative w-full max-w-md rounded-3xl bg-white text-center px-6 pt-10 pb-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={close} aria-label="Zavrieť" className="absolute top-4 right-4 p-2 rounded-full text-mute hover:bg-blue-soft/40 cursor-pointer">
          <X size={18} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/logo_c.webp" alt="KROK – pastoračný fond Žilinskej diecézy" className="mx-auto h-14 w-auto" />
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.25em] text-gold-ink">{announcement.kicker}</p>
        <h2 id="krok-announcement-title" className="mt-3 text-2xl font-light leading-tight text-ink">{announcement.title}</h2>
        <p className="mt-3 text-sm text-mute leading-relaxed">{announcement.text}</p>
        {external ? (
          <a href={announcement.href} target="_blank" rel="noopener" onClick={close} className={btnCls}>
            {announcement.cta} <ArrowUpRight size={18} />
          </a>
        ) : (
          <Link href={announcement.href} onClick={close} className={btnCls}>
            {announcement.cta}
          </Link>
        )}
        <button type="button" onClick={close} className="mt-3 text-sm font-bold text-mute hover:text-ink cursor-pointer">
          Teraz nie
        </button>
      </div>
    </div>
  )
}
