'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Church, Clock, HandHeart, Menu, Settings, X } from 'lucide-react'

export interface ParishNavItem {
  label: string
  href: string
  /** samostatná stránka (Oznamy, Aktuality) – ostatné sú kotvy na stránke farnosti */
  page?: boolean
  active?: boolean
}

interface Props {
  name: string
  subtitle: string | null
  imageUrl: string | null
  /** erb / logo – má prednosť pred fotkou, zobrazí sa celý (bez orezania do kruhu) */
  logoUrl?: string | null
  homeHref: string
  items: ParishNavItem[]
  supportHref: string
  manageUrl: string | null
  /** tlačidlo „Časy omší“ – základná stránka bohoslužby nemá */
  showMassTimes?: boolean
  /** web diecézy – v tenkom páse „Žilinská diecéza · Farnosti“ namiesto „KROK · Farnosti Žilinskej diecézy“ */
  dcza?: boolean
}

/** Hlavička stránky farnosti (návrh A): tenký pás KROK + lepkavá lišta farnosti, na mobile vysúvacie menu. */
export default function ParishHeader({ name, subtitle, imageUrl, logoUrl, homeHref, items, supportHref, manageUrl, showMassTimes = true, dcza = false }: Props) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkCls = (active?: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-extrabold whitespace-nowrap transition-colors ${active ? 'text-blue' : 'text-ink/85 hover:text-blue'}`
  const NavLink = ({ it, onClick, className }: { it: ParishNavItem; onClick?: () => void; className: string }) =>
    it.page ? (
      <Link href={it.href} onClick={onClick} className={className} aria-current={it.active ? 'page' : undefined}>
        {it.label}
      </Link>
    ) : (
      <a href={it.href} onClick={onClick} className={className}>
        {it.label}
      </a>
    )

  return (
    <>
      {/* Tenký pás KROK */}
      <div className="bg-blue text-[11px] sm:text-xs text-white/85">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between gap-3">
          <Link href="/farnosti" className="inline-flex items-center gap-1 hover:text-gold-bright min-w-0">
            <ChevronLeft size={14} className="shrink-0" />
            <span className="truncate">
              {dcza ? (
                <>
                  <strong className="font-black tracking-wider text-white">Žilinská diecéza</strong> · Farnosti
                </>
              ) : (
                <>
                  <strong className="font-black tracking-wider text-white">KROK</strong> · Farnosti Žilinskej diecézy
                </>
              )}
            </span>
          </Link>
          <div className="flex items-center gap-4 shrink-0">
            {manageUrl && (
              <Link href={manageUrl} className="hidden sm:inline-flex items-center gap-1 hover:text-gold-bright">
                <Settings size={13} /> Spravovať farnosť
              </Link>
            )}
            <Link href={supportHref} className="inline-flex items-center gap-1 font-bold text-gold-bright hover:underline">
              <HandHeart size={13} /> Podporiť fond
            </Link>
          </div>
        </div>
      </div>

      {/* Lišta farnosti */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${scrolled ? 'bg-white/75 backdrop-blur-md border-blue/10 shadow-md shadow-blue/5' : 'bg-white/85 backdrop-blur-md border-blue/10'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href={homeHref} className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-11 w-11 object-contain shrink-0" />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-gold/40 shrink-0" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-white border border-gold/30 flex items-center justify-center text-gold-ink shrink-0">
                <Church size={20} />
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-extrabold text-ink leading-tight truncate">{name}</span>
              {subtitle && <span className="block text-xs text-mute truncate">{subtitle}</span>}
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {items.map((it) => (
              <NavLink key={it.href} it={it} className={linkCls(it.active)} />
            ))}
            {showMassTimes && (
              <a href={items.find((i) => i.href.endsWith('#bohosluzby'))?.href ?? `${homeHref}#bohosluzby`} className="ml-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-blue-deep font-black text-sm hover:bg-gold-bright">
                <Clock size={15} /> Časy omší
              </a>
            )}
          </nav>

          <button type="button" onClick={() => setOpen((o) => !o)} className="lg:hidden p-2 -mr-2 text-ink" aria-label={open ? 'Zavrieť menu' : 'Menu'} aria-expanded={open}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden border-t border-blue/10 bg-white">
            <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col">
              {items.map((it) => (
                <NavLink key={it.href} it={it} onClick={() => setOpen(false)} className={`${linkCls(it.active)} py-3 text-base border-b border-blue/10`} />
              ))}
              {manageUrl && (
                <Link href={manageUrl} className={`${linkCls()} py-3 text-base inline-flex items-center gap-2`}>
                  <Settings size={16} /> Spravovať farnosť
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
