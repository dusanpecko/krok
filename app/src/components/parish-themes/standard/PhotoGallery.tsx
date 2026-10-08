'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import type { PublicGalleryPhoto } from '@/lib/parishes/gallery'
import { photoCount } from '@/lib/parishes/format'

/**
 * Fotky farnosti s lightboxom (§ 17): variant „strip“ = pás hore na stránke (veľká + menšie fotky),
 * „grid“ = mriežka albumu. Lightbox: šípky, klávesnica (←/→/Esc), potiahnutie prstom.
 */
export default function PhotoGallery({ photos, variant = 'grid', title }: { photos: PublicGalleryPhoto[]; variant?: 'strip' | 'grid'; title?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!photos.length) return null

  return (
    <>
      {variant === 'strip' ? <Strip photos={photos} onOpen={setOpen} title={title} /> : <Grid photos={photos} onOpen={setOpen} />}
      {open != null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  )
}

function Thumb({ photo, onClick, className = '', alt, children }: { photo: PublicGalleryPhoto; onClick: () => void; className?: string; alt: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`relative overflow-hidden rounded-2xl bg-blue-soft/20 cursor-zoom-in group ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.caption || alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      {children}
    </button>
  )
}

function Strip({ photos, onOpen, title }: { photos: PublicGalleryPhoto[]; onOpen: (i: number) => void; title?: string }) {
  const alt = title ?? 'Fotka farnosti'
  const small = photos.slice(1, 5)
  const rest = photos.length - 1 - small.length
  if (photos.length === 1) {
    return <Thumb photo={photos[0]} onClick={() => onOpen(0)} alt={alt} className="block w-full aspect-[16/7]" />
  }
  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 aspect-[16/9] sm:aspect-[16/7]">
      <Thumb photo={photos[0]} onClick={() => onOpen(0)} alt={alt} className={small.length ? 'col-span-4 sm:col-span-2 row-span-2' : 'col-span-4 row-span-2'}>
        <span className="sm:hidden absolute right-3 bottom-3 px-3 py-1.5 rounded-full bg-ink/60 text-white text-xs font-extrabold inline-flex items-center gap-1.5">
          <Images size={14} /> {photoCount(photos.length)}
        </span>
      </Thumb>
      {small.map((p, i) => {
        const last = i === small.length - 1 && rest > 0
        // na mobile len veľká fotka + tlačidlo; menšie od sm
        const span = small.length === 1 ? 'sm:col-span-2 sm:row-span-2' : small.length === 2 ? 'sm:col-span-2' : small.length === 3 && i === 2 ? 'sm:col-span-2' : ''
        return (
          <Thumb key={p.url} photo={p} onClick={() => onOpen(i + 1)} alt={alt} className={`hidden sm:block ${span}`}>
            {last && (
              <span className="absolute inset-0 bg-ink/45 text-white flex items-center justify-center gap-2 font-extrabold text-lg">
                <Images size={20} /> +{rest}
              </span>
            )}
          </Thumb>
        )
      })}
    </div>
  )
}

function Grid({ photos, onOpen }: { photos: PublicGalleryPhoto[]; onOpen: (i: number) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      {photos.map((p, i) => (
        <Thumb key={p.url} photo={p} onClick={() => onOpen(i)} alt={`Fotka ${i + 1}`} className="block aspect-[4/3]" />
      ))}
    </div>
  )
}

function Lightbox({ photos, index, onIndex, onClose }: { photos: PublicGalleryPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const touchX = useRef<number | null>(null)
  const n = photos.length
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [go, onClose])

  const p = photos[index]
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fotogaléria"
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white/80 text-sm">
        <span>
          {index + 1} / {n}
        </span>
        <button type="button" onClick={onClose} aria-label="Zavrieť" className="p-2 rounded-full hover:bg-white/10 cursor-pointer">
          <X size={22} />
        </button>
      </div>
      <div className="relative flex-1 flex items-center justify-center px-2 sm:px-16 min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt={p.caption ?? ''} className="max-w-full max-h-full object-contain select-none" onClick={(e) => e.stopPropagation()} />
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Predchádzajúca"
              onClick={(e) => {
                e.stopPropagation()
                go(-1)
              }}
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              aria-label="Ďalšia"
              onClick={(e) => {
                e.stopPropagation()
                go(1)
              }}
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>
      <p className="min-h-[3rem] px-4 py-3 text-center text-white/85 text-sm" onClick={(e) => e.stopPropagation()}>
        {p.caption}
      </p>
    </div>
  )
}
