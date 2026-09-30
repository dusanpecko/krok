'use client'

import type { ParishChangeLogEntry, ParishYearSummary } from '@/lib/parishes/types'
import { cardCls, SectionTitle } from '@/components/admin/projects/ui'

const eur = (n: number | null) => (n == null ? '—' : n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' }))

const ACTION_LABEL: Record<string, string> = {
  import: 'Import',
  admin_update: 'Úprava (diecéza)',
  submit: 'Návrh farnosti',
  approve: 'Schválené',
  reject: 'Zamietnuté',
}
const ENTITY_LABEL: Record<string, string> = { parish: 'údaje', population: 'obce a štatistika', schedule: 'bohoslužby', clergy: 'kňazi' }

/** Úprava údajov farnosti ukladá zmeny ako { pole: [staré, nové] }; ostatné záznamy sú prosté hodnoty. */
function describe(l: ParishChangeLogEntry): string {
  if (!l.changes) return ''
  const isDiff = l.entity === 'parish' && l.action === 'admin_update'
  return Object.entries(l.changes)
    .map(([k, v]) => (isDiff && Array.isArray(v) && v.length === 2 ? `${k}: ${v[0] ?? '—'} → ${v[1] ?? '—'}` : `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`))
    .join(' · ')
}

/** Prínos farnosti do fondu po rokoch (len agregáty, O3) + história zmien (audit). */
export default function ParishDonationsTab({ summary, log, donorsCount }: { summary: ParishYearSummary[]; log: ParishChangeLogEntry[]; donorsCount: number }) {
  const withData = summary.filter((s) => s.donations_count > 0 || s.prescribed_amount != null)
  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <SectionTitle
          title="Prínos farnosti do fondu"
          description={`Dary darcov s touto farnosťou (farnosť v čase daru). Darcov s farnosťou teraz: ${donorsCount}. Predpis sa generuje vo fáze F3.`}
        />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
              <th className="py-2">Rok</th>
              <th className="py-2 text-right">Darcovia</th>
              <th className="py-2 text-right">Dary</th>
              <th className="py-2 text-right">Vybrané</th>
              <th className="py-2 text-right">Predpis</th>
              <th className="py-2 text-right">Plnenie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {withData.map((s) => (
              <tr key={s.year}>
                <td className="py-2 font-bold">{s.year}</td>
                <td className="py-2 text-right font-mono">{s.donors_count}</td>
                <td className="py-2 text-right font-mono">{s.donations_count}</td>
                <td className="py-2 text-right font-mono font-bold text-green-700">{eur(s.collected_amount)}</td>
                <td className="py-2 text-right font-mono">{eur(s.prescribed_amount)}</td>
                <td className="py-2 text-right font-mono">{s.fulfillment_pct != null ? `${s.fulfillment_pct} %` : '—'}</td>
              </tr>
            ))}
            {withData.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Farnosť zatiaľ nemá dary.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className={cardCls}>
        <SectionTitle title="História zmien" description="Posledných 30 zmien – kto, kedy a čo zmenil." />
        <ul className="divide-y divide-gray-50 text-sm">
          {log.map((l) => (
            <li key={l.id} className="py-3">
              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                <span className="font-mono">{new Date(l.created_at).toLocaleString('sk-SK')}</span>
                <span className="font-bold text-gray-800">{ACTION_LABEL[l.action] ?? l.action}</span>
                <span>{ENTITY_LABEL[l.entity] ?? l.entity}</span>
                {l.user_email && <span>{l.user_email}</span>}
              </div>
              <div className="text-xs text-gray-600 mt-1 break-words">{describe(l)}</div>
            </li>
          ))}
          {log.length === 0 && <li className="py-6 text-center text-gray-400">Bez zmien.</li>}
        </ul>
      </div>
    </div>
  )
}
