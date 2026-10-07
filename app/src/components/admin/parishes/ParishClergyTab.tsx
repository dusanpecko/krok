'use client'

import Link from 'next/link'
import { ExternalLink, Users } from 'lucide-react'
import { btnSecondary, cardCls, SectionTitle } from '@/components/admin/projects/ui'
import type { ParishClergyEntry } from '@/lib/parishes/parish-clergy'
import { clergyName } from '@/lib/parishes/format'

/**
 * Kňazi farnosti – len na čítanie z registra kňazov (K3, O49). Menovanie, preloženie a ukončenie
 * pôsobenia robí diecéza v Schematizme kňazov; stránka farnosti ukáže zmenu hneď.
 */
export default function ParishClergyTab({ clergy }: { clergy: ParishClergyEntry[] }) {
  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle
        title="Kňazi vo farnosti"
        description="Z registra kňazov (Schematizmus kňazov). Na stránke farnosti sa zobrazí len meno, tituly a funkcia – bez fotky a kontaktov (O47). Zmenu pôsobenia zapíšte pri kňazovi v registri („Nové menovanie“)."
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
            <th className="py-2">Kňaz</th>
            <th className="py-2">Funkcia</th>
            <th className="py-2">Od</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {clergy.map((c) => (
            <tr key={c.clergy_id} className={c.is_head ? 'bg-amber-50/40' : ''}>
              <td className="py-2 font-bold text-gray-900">{clergyName(c)}</td>
              <td className="py-2 text-gray-600">{c.position}</td>
              <td className="py-2 text-gray-500 font-mono text-xs">{c.since ?? '—'}</td>
              <td className="py-2 text-right">
                <Link href={`/admin/knazi/${c.clergy_id}`} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                  v registri <ExternalLink size={12} />
                </Link>
              </td>
            </tr>
          ))}
          {clergy.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-400">V registri nemá farnosť aktuálne žiadneho kňaza.</td>
            </tr>
          )}
        </tbody>
      </table>
      <Link href="/admin/knazi" className={btnSecondary}>
        <Users size={14} /> Schematizmus kňazov
      </Link>
    </div>
  )
}
