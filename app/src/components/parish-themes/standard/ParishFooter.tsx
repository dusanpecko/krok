import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import type { PublicParish } from '@/lib/parishes/public'
import { hasParishSchedule, parishDisplayName } from '@/lib/parishes/format'
import { socialLabel } from '@/lib/parishes/social'
import SocialIcon from '@/components/parishes/SocialIcon'
import KrokLogo from '@/components/KrokLogo'

/** Pätička stránky farnosti – kontakt farnosti, jej siete a odkaz na prevádzkovateľa (KROK). */
export default function ParishFooter({ parish, krokBase = '' }: { parish: PublicParish; /** na dcza.sk adresa mojkrok.sk */ krokBase?: string }) {
  const base = `/farnosti/${parish.slug}`
  const address = [parish.street, [parish.postal_code, parish.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return (
    <footer className="bg-[#03172c] text-blue-100/70 border-t border-white/10 pb-20 lg:pb-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <div className="space-y-2">
          <p className="font-extrabold text-white text-base flex items-center gap-3">
            {parish.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={parish.logo_url} alt="" className="h-12 w-12 object-contain shrink-0" />
            )}
            {parishDisplayName(parish)}
          </p>
          {address && <p className="flex gap-2"><MapPin size={16} className="text-gold shrink-0 mt-0.5" /> {address}</p>}
          {parish.phone && (
            <p className="flex gap-2"><Phone size={16} className="text-gold shrink-0 mt-0.5" /> <a href={`tel:${parish.phone.replace(/[^\d+]/g, '')}`} className="hover:text-gold-bright">{parish.phone}</a></p>
          )}
          {parish.email && (
            <p className="flex gap-2"><Mail size={16} className="text-gold shrink-0 mt-0.5" /> <a href={`mailto:${parish.email}`} className="hover:text-gold-bright break-all">{parish.email}</a></p>
          )}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-3">Farnosť</p>
          <ul className="space-y-2">
            {(!parish.basic || hasParishSchedule(parish)) && <li><a href={`${base}#bohosluzby`} className="hover:text-gold-bright">Bohoslužby</a></li>}
            {!parish.basic && (
              <>
                <li><Link href={`${base}/oznamy`} className="hover:text-gold-bright">Farské oznamy</Link></li>
                <li><Link href={`${base}/aktuality`} className="hover:text-gold-bright">Aktuality</Link></li>
                <li><a href={`${base}#sviatosti`} className="hover:text-gold-bright">Sviatosti</a></li>
              </>
            )}
            <li><a href={`${base}#kontakt`} className="hover:text-gold-bright">Kontakt</a></li>
          </ul>
        </div>
        {parish.social_links.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-3">Sledujte nás</p>
            <div className="flex flex-wrap gap-2">
              {parish.social_links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" title={socialLabel(l)} aria-label={socialLabel(l)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:border-gold/40 hover:text-gold-bright">
                  <SocialIcon kind={l.kind} size={18} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <Link href={`${krokBase}/`} className="flex items-center gap-3 hover:text-white">
            <KrokLogo variant="white" height={22} />
            <span>Stránku farnosti prevádzkuje Pastoračný fond KROK · Žilinská diecéza</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/farnosti" className="hover:text-white">Všetky farnosti</Link>
            <Link href={`${krokBase}/ochrana-udajov`} className="hover:text-white">Ochrana osobných údajov</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
