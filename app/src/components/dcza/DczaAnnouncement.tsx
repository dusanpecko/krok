'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import type { DczaAnnouncementData } from '@/lib/diocese/announcement'

const STORAGE_PREFIX = 'dcza_announcement_'

/** Okno s krátkym oznámením (erb + správa); po kliknutí otvorí článok. Zatvorenie si pamätá v prehliadači. */
export default function DczaAnnouncement({ announcement }: { announcement: DczaAnnouncementData }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const key = STORAGE_PREFIX + announcement.id

  const close = useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(key, '1')
    } catch {}
  }, [key])

  useEffect(() => {
    if (new Date().toISOString().slice(0, 10) > announcement.until) return
    if (pathname?.endsWith(announcement.href)) return // na samotnom článku nie
    try {
      if (localStorage.getItem(key)) return
    } catch {}
    // krátke oneskorenie – stránka sa najprv vykreslí, potom sa okno zobrazí
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [announcement, key, pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-deep/70 backdrop-blur-sm" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dcza-announcement-title"
        className="relative w-full max-w-md rounded-3xl bg-white text-center px-6 pt-10 pb-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={close} aria-label="Zavrieť" className="absolute top-4 right-4 p-2 rounded-full text-mute hover:bg-blue-soft/40 cursor-pointer">
          <X size={18} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dcza/erb-240.png" alt="Erb Žilinskej diecézy" width={96} height={112} className="mx-auto w-24 h-auto" />
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.25em] text-wine">{announcement.kicker}</p>
        <h2 id="dcza-announcement-title" className="mt-3 text-2xl font-light leading-tight">{announcement.title}</h2>
        <p className="mt-3 text-sm text-mute leading-relaxed">{announcement.text}</p>
        <Link
          href={announcement.href}
          onClick={close}
          className="mt-6 inline-flex items-center justify-center w-full px-6 py-3.5 rounded-2xl bg-blue text-white font-extrabold hover:bg-blue-deep transition-colors"
        >
          {announcement.cta}
        </Link>
      </div>
    </div>
  )
}
