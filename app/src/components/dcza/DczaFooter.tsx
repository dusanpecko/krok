import Link from 'next/link'
import Image from 'next/image'
import { Mail, MapPin, Phone } from 'lucide-react'
import type { NavItem } from '@/lib/diocese/nav'

/** Pätička webu diecézy. */
export default function DczaFooter({ nav }: { nav: NavItem[] }) {
  return (
    <footer className="bg-blue-deep text-white/75">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-[1.3fr_2fr]">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <Image src="/dcza/erb-240.png" alt="" width={41} height={48} />
            <span className="leading-tight">
              <span className="block font-black text-lg text-white">Žilinská diecéza</span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-white/60">Biskupský úrad</span>
            </span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <MapPin size={16} className="text-gold shrink-0 mt-0.5" /> Jána Kalinčiaka 1, 010 01 Žilina
            </li>
            <li className="flex gap-2">
              <Phone size={16} className="text-gold shrink-0 mt-0.5" /> <a href="tel:+421415002215" className="hover:text-white">+421 41 500 22 15</a>
            </li>
            <li className="flex gap-2">
              <Mail size={16} className="text-gold shrink-0 mt-0.5" /> <a href="mailto:sekretariat@dcza.sk" className="hover:text-white">sekretariat@dcza.sk</a>
            </li>
          </ul>
          <a href="https://www.facebook.com/zilinskadieceza" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold">
            <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white text-xs font-black flex items-center justify-center">f</span> Sledujte nás na Facebooku
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
          {nav.slice(0, 6).map((item) => (
            <div key={item.href}>
              <Link href={item.href} className="font-extrabold text-white hover:text-gold-bright">
                {item.label}
              </Link>
              <ul className="mt-3 space-y-1.5">
                {(item.children ?? []).slice(0, 6).map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="hover:text-white">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap justify-between gap-3 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Rímskokatolícka cirkev, Žilinská diecéza</span>
          <span className="flex gap-4">
            <Link href="/dokumenty/ochrana-osobnych-udajov" className="hover:text-white">Ochrana osobných údajov</Link>
            <a href="https://mojkrok.sk" className="hover:text-white">mojkrok.sk</a>
          </span>
        </div>
      </div>
    </footer>
  )
}
