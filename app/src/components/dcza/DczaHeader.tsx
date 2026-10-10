'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, Search, X } from 'lucide-react'
import type { NavItem } from '@/lib/diocese/nav'

/** Hlavička webu diecézy: horná lišta (pri skrolovaní odíde hore), lepkavá lišta s erbom a hlavným menu, mobilné menu. */
export default function DczaHeader({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- zavrieť menu po navigácii
    setMobile(false)
    setOpen(null)
  }, [pathname])

  const isActive = (href: string) => href !== '/' && !href.startsWith('http') && pathname.startsWith(href.split('?')[0])

  return (
    <>
      <div className="hidden md:block bg-blue-deep text-white/80 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-end gap-5">
          <a href="https://www.facebook.com/zilinskadieceza" target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a>
          <Link href="/kuria/urady/nahlasovanie-zneuzivania" className="hover:text-white">Nahlásenie zneužívania</Link>
          <Link href="/knazska-zona" className="hover:text-white">Kňazská zóna</Link>
          <a href="https://mojkrok.sk" className="hover:text-white font-bold text-gold-bright/90">KROK – Pastoračný fond</a>
        </div>
      </div>
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-blue/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image src="/dcza/erb-240.png" alt="Erb Žilinskej diecézy" width={41} height={48} priority />
          <span className="leading-tight">
            <span className="block font-black text-lg tracking-tight text-ink">Žilinská diecéza</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-mute">Rímskokatolícka cirkev</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" onMouseLeave={() => setOpen(null)}>
          {nav.map((item) => (
            <div key={item.href} className="relative" onMouseEnter={() => setOpen(item.children?.length ? item.href : null)}>
              <Link
                href={item.href}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${isActive(item.href) ? 'text-blue' : 'text-ink/80 hover:text-blue hover:bg-blue-soft/40'}`}
              >
                {item.label}
                {!!item.children?.length && <ChevronDown size={14} className="opacity-60" />}
              </Link>
              {open === item.href && !!item.children?.length && (
                <div className="absolute left-0 top-full pt-2 min-w-[260px]">
                  <div className="rounded-2xl bg-white border border-blue/10 shadow-xl p-2">
                    {item.children.map((c) => (
                      <div key={c.href}>
                        <Link href={c.href} className="block px-3 py-2 rounded-xl text-sm font-bold text-ink/85 hover:bg-blue-soft/40 hover:text-blue">
                          {c.label}
                        </Link>
                        {!!c.children?.length && (
                          <div className="pl-3 pb-1">
                            {c.children.map((g) => (
                              <Link key={g.href} href={g.href} className="block px-3 py-1.5 rounded-lg text-[13px] text-mute hover:text-blue">
                                {g.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link href="/hladat" aria-label="Hľadať" className="ml-1 p-2 rounded-xl text-ink/70 hover:text-blue hover:bg-blue-soft/40">
            <Search size={18} />
          </Link>
        </nav>

        <button type="button" onClick={() => setMobile((m) => !m)} aria-label="Menu" className="lg:hidden p-2 rounded-xl text-ink cursor-pointer">
          {mobile ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobile && (
        <div className="lg:hidden border-t border-blue/10 bg-white max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            <Link href="/hladat" className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-ink/85">
              <Search size={16} /> Hľadať
            </Link>
            {nav.map((item) => (
              <details key={item.href} className="group">
                <summary className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-ink cursor-pointer list-none">
                  <Link href={item.href}>{item.label}</Link>
                  {!!item.children?.length && <ChevronDown size={16} className="group-open:rotate-180 transition-transform" />}
                </summary>
                {!!item.children?.length && (
                  <div className="pl-4 pb-2">
                    {item.children.map((c) => (
                      <Link key={c.href} href={c.href} className="block px-3 py-2 text-sm text-ink/80">
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </details>
            ))}
            <div className="pt-3 mt-3 border-t border-blue/10 text-sm space-y-1">
              <Link href="/knazska-zona" className="block px-3 py-2 text-mute">Kňazská zóna</Link>
              <a href="https://mojkrok.sk" className="block px-3 py-2 text-mute">KROK – Pastoračný fond</a>
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  )
}
