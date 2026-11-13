/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from 'lucide-react'

/** Plávajúce tlačidlo vpravo dole na mojkrok.sk – odkaz na web Žilinskej diecézy. */
export default function DczaFloatingLink() {
  return (
    <a
      href="https://www.dcza.sk"
      target="_blank"
      rel="noopener"
      aria-label="Žilinská diecéza – www.dcza.sk (otvorí sa v novom okne)"
      className="group fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 rounded-full bg-white/95 backdrop-blur border border-blue/15 shadow-lg hover:shadow-xl hover:border-gold/60 pl-1.5 pr-4 py-1.5 transition-all print:hidden"
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
