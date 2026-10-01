'use client'

import { Clock } from 'lucide-react'

/** Plávajúce tlačidlo „Časy omší“ na mobile – skok na rozpis bohoslužieb. */
export default function MassTimesButton() {
  return (
    <a
      href="#bohosluzby"
      className="lg:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gold text-blue-deep font-black text-sm shadow-xl shadow-black/30"
    >
      <Clock size={16} /> Časy omší
    </a>
  )
}
