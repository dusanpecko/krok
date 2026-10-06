import Link from 'next/link'
import { Bell, Clock, HandHeart, MapPin, Phone } from 'lucide-react'

/**
 * Spodná lišta na mobile: omše, oznamy, zavolať (bez telefónu → kontakt).
 * Základná stránka bez rozpisu omší / bez oznamov: namiesto nich kontakt a podpora.
 */
export default function MobileBar({ base, phone, massTimes = true, posts = true, supportHref }: { base: string; phone: string | null; massTimes?: boolean; posts?: boolean; supportHref: string }) {
  const cell = 'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-extrabold text-ink/85 active:text-blue'
  const contact = (
    <a key="kontakt" href={`${base}#kontakt`} className={cell}>
      <MapPin size={20} className="text-gold-ink" /> Kontakt
    </a>
  )
  const support = (
    <Link key="podporit" href={supportHref} className={cell}>
      <HandHeart size={20} className="text-gold-ink" /> Podporiť
    </Link>
  )
  const cells = [
    massTimes ? (
      <a key="omse" href={`${base}#bohosluzby`} className={cell}>
        <Clock size={20} className="text-gold-ink" /> Omše
      </a>
    ) : (
      contact
    ),
    posts ? (
      <Link key="oznamy" href={`${base}/oznamy`} className={cell}>
        <Bell size={20} className="text-gold-ink" /> Oznamy
      </Link>
    ) : (
      support
    ),
    phone ? (
      <a key="tel" href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={cell}>
        <Phone size={20} className="text-gold-ink" /> Zavolať
      </a>
    ) : massTimes ? (
      contact
    ) : posts ? (
      support
    ) : null,
  ].filter(Boolean)
  return (
    <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-40 grid ${cells.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} bg-white/95 backdrop-blur border-t border-blue/10 shadow-[0_-4px_16px_rgba(9,80,150,0.06)] pb-[env(safe-area-inset-bottom)]`} aria-label="Rýchle odkazy">
      {cells}
    </nav>
  )
}
