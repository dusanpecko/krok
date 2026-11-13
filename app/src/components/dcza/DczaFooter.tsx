import Link from 'next/link'
import Image from 'next/image'
import { Mail, MapPin, Phone } from 'lucide-react'
import type { NavItem } from '@/lib/diocese/nav'
import NewsletterSignup from '@/components/public/NewsletterSignup'
import ProtectedEmail from '@/components/ProtectedEmail'
import { encodeEmail } from '@/lib/email-code'

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
              <Mail size={16} className="text-gold shrink-0 mt-0.5" /> <ProtectedEmail code={encodeEmail('sekretariat@dcza.sk')} icon={false} className="hover:text-white" />
            </li>
          </ul>
          <p className="mt-5 mb-2 text-[11px] uppercase tracking-[0.18em] text-white/60">Sledujte nás</p>
          <div className="flex flex-wrap gap-2">
            <a href="https://www.facebook.com/zilinskadieceza" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold">
              <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white text-xs font-black flex items-center justify-center">f</span> Facebook
            </a>
            <a href="https://www.instagram.com/zilinskadieceza/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold">
              <span className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center" aria-hidden>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#fff" strokeWidth="2.2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
                </svg>
              </span>{' '}
              Instagram
            </a>
          </div>
          <div className="mt-8">
            <NewsletterSignup source="dcza" />
          </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Rímskokatolícka cirkev, Žilinská diecéza</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/dokumenty/ochrana-osobnych-udajov" className="hover:text-white">Ochrana osobných údajov</Link>
            <a href="https://mojkrok.sk" className="hover:text-white">mojkrok.sk</a>
            <span className="hidden sm:block w-px h-4 bg-white/15" aria-hidden />
            <span>Created with ❤️ for Žilinská diecéza</span>
            <span className="hidden sm:block w-px h-4 bg-white/15" aria-hidden />
            <a href="https://www.lectio.one" target="_blank" rel="noopener" className="group inline-flex items-center gap-2 hover:text-white transition-colors">
              Beží na platforme
              <Image src="/lectio/lectio_logo_white.webp" alt="lectio.one" width={800} height={142} className="h-4 w-auto opacity-70 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
