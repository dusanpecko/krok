import Link from 'next/link'
import { Bell, Clock, HandHeart, MapPin, Phone } from 'lucide-react'

/**
 * Spodná lišta na mobile: omše, oznamy, zavolať (bez telefónu → kontakt).
 * Základná stránka bez rozpisu omší / bez oznamov: namiesto nich kontakt a podpora.
 */
export default function MobileBar({ base, phone, massTimes = true, posts = true, supportHref }: { base: string; phone: string | null; massTimes?: boolean; posts?: boolean; supportHref: string }) {
  const cell = 'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-extrabold text-blue-50/85 active:text-gold-bright'
  const contact = (
    <a key="kontakt" href={`${base}#kontakt`} className={cell}>
      <MapPin size={20} className="text-gold" /> Kontakt
    </a>
  )
  const support = (
    <Link key="podporit" href={supportHref} className={cell}>
      <HandHeart size={20} className="text-gold" /> Podporiť
    </Link>
  )
  const cells = [
    massTimes ? (
      <a key="omse" href={`${base}#bohosluzby`} className={cell}>
        <Clock size={20} className="text-gold" /> Omše
      </a>
    ) : (
      contact
    ),
    posts ? (
      <Link key="oznamy" href={`${base}/oznamy`} className={cell}>
        <Bell size={20} className="text-gold" /> Oznamy
      </Link>
    ) : (
      support
    ),
    phone ? (
      <a key="tel" href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={cell}>
        <Phone size={20} className="text-gold" /> Zavolať
      </a>
    ) : massTimes ? (
      contact
    ) : posts ? (
      support
    ) : null,
  ].filter(Boolean)
  return (
    <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-40 grid ${cells.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} bg-[#03172c]/95 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]`} aria-label="Rýchle odkazy">
      {cells}
    </nav>
  )
}
