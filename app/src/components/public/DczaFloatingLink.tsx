'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

/** Plávajúce tlačidlo vpravo dole na mojkrok.sk – odkaz na web Žilinskej diecézy; pri pätičke sa skryje (odkaz je v nej). */
export default function DczaFloatingLink() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const footer = document.querySelector('footer')
    if (!footer) return
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { rootMargin: '0px 0px -40px 0px' })
    io.observe(footer)
    return () => io.disconnect()
  }, [])

  return (
    <a
      href="https://www.dcza.sk"
      target="_blank"
      rel="noopener"
      aria-label="Žilinská diecéza – www.dcza.sk (otvorí sa v novom okne)"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : undefined}
      className={`group fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 rounded-full bg-white/95 backdrop-blur border border-blue/15 shadow-lg hover:shadow-xl hover:border-gold/60 pl-1.5 pr-4 py-1.5 transition-all duration-300 print:hidden ${hidden ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}
    >
      <span className="w-9 h-9 rounded-full bg-blue-soft/60 flex items-center justify-center shrink-0">
        <img src="/dcza/erb-240.png" alt="" className="w-6 h-auto" />
      </span>
      <span className="leading-tight">
        <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-mute">Žilinská diecéza</span>
        <span className="block text-sm font-extrabold text-ink group-hover:text-blue">dcza.sk</span>
      </span>
      <ArrowUpRight size={16} className="text-mute group-hover:text-blue transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  )
}
