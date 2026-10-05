import Link from 'next/link'
import { Bell, Clock, MapPin, Phone } from 'lucide-react'

/** Spodná lišta na mobile: omše, oznamy, zavolať (bez telefónu → kontakt). */
export default function MobileBar({ base, phone }: { base: string; phone: string | null }) {
  const cell = 'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-extrabold text-blue-50/85 active:text-gold-bright'
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 bg-[#03172c]/95 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]" aria-label="Rýchle odkazy">
      <a href={`${base}#bohosluzby`} className={cell}>
        <Clock size={20} className="text-gold" /> Omše
      </a>
      <Link href={`${base}/oznamy`} className={cell}>
        <Bell size={20} className="text-gold" /> Oznamy
      </Link>
      {phone ? (
        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={cell}>
          <Phone size={20} className="text-gold" /> Zavolať
        </a>
      ) : (
        <a href={`${base}#kontakt`} className={cell}>
          <MapPin size={20} className="text-gold" /> Kontakt
        </a>
      )}
    </nav>
  )
}
