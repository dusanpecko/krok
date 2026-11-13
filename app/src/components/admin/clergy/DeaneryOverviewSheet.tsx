'use client'

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { btnPrimary, cardCls } from '@/components/admin/projects/ui'
import type { OverviewDeanery, OverviewPerson } from '@/app/admin/knazi/zostavy/actions'

/** Prehľad dekanátov a farností (pre biskupa) – A4, každý dekanát na novej strane; pri tlači len hárky. */
export default function DeaneryOverviewSheet({ deaneries, title }: { deaneries: OverviewDeanery[]; title: string }) {
  const people = new Set(deaneries.flatMap((d) => d.parishes.flatMap((p) => p.people.map((x) => x.id))))
  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 12mm 14mm }
          body * { visibility: hidden !important }
          #overview, #overview * { visibility: visible !important }
          #overview { position: absolute; left: 0; top: 0; width: 100% }
          #overview .sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; width: auto !important; min-height: 0 !important }
          #overview .sheet + .sheet { break-before: page }
        }
        #overview .sheet { font-family: Arial, sans-serif; color: #000; font-size: 9.5pt; line-height: 1.3 }
        #overview .doc-title { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; color: #555; text-align: center }
        #overview h2 { font-size: 17pt; font-weight: bold; text-align: center; margin: 1mm 0 4mm }
        #overview .dean { border: 1.5px solid #000; border-radius: 2mm; padding: 2.5mm 3mm; margin-bottom: 5mm; display: flex; gap: 3mm; align-items: center }
        #overview .parish { break-inside: avoid; border-top: 1px solid #999; padding: 2.5mm 0 1.5mm }
        #overview .parish h3 { font-size: 11pt; font-weight: bold; margin-bottom: 1.5mm }
        #overview .people { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 4mm }
        #overview .person { display: flex; gap: 2.5mm; align-items: center }
        #overview .photo { width: 13mm; height: 17mm; border-radius: 1mm; object-fit: cover; flex-shrink: 0; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10pt; font-weight: bold; color: #888; -webkit-print-color-adjust: exact; print-color-adjust: exact }
        #overview .dean .photo { width: 16mm; height: 21mm }
        #overview .role { font-size: 8.5pt; color: #444 }
        #overview .empty { font-size: 9pt; color: #777; font-style: italic }
      `}</style>

      <div className={`print:hidden ${cardCls} flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[210mm] mx-auto`}>
        <div>
          <Link href="/admin/knazi/zostavy" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
            <ArrowLeft size={16} /> Zostavy
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            {deaneries.length === 1 ? `Dekanát ${deaneries[0].name}` : `${deaneries.length} dekanátov – každý na samostatnej strane`} · {deaneries.reduce((s, d) => s + d.parishes.length, 0)} farností · {people.size} osôb
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className={btnPrimary}>
          <Printer size={16} /> Tlačiť
        </button>
      </div>

      <div id="overview" className="space-y-6">
        {deaneries.map((d) => (
          <section key={d.id} className="sheet bg-white border border-gray-200 shadow-sm mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '12mm' }}>
            {title && <div className="doc-title">{title}</div>}
            <h2>Dekanát {d.name}</h2>
            <div className="dean">
              {d.deans.length ? (
                d.deans.map((p) => <Person key={p.id} p={p} label="Dekan" />)
              ) : (
                <span className="empty">Dekan nie je uvedený.</span>
              )}
            </div>
            {d.parishes.map((parish) => (
              <div key={parish.id} className="parish">
                <h3>
                  {parish.name}
                  {parish.kind === 'chaplaincy' && <span className="role"> · duchovná správa</span>}
                </h3>
                {parish.people.length ? (
                  <div className="people">
                    {parish.people.map((p) => <Person key={`${parish.id}-${p.id}-${p.role}`} p={p} />)}
                  </div>
                ) : (
                  <p className="empty">Bez kňaza s pôsobením vo farnosti.</p>
                )}
              </div>
            ))}
          </section>
        ))}
        {deaneries.length === 0 && <p className="print:hidden text-center text-gray-500">Žiadny dekanát.</p>}
      </div>
    </div>
  )
}

function Person({ p, label }: { p: OverviewPerson; label?: string }) {
  const initials = p.name.split(' ').filter((w) => /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][a-záäčďéíľĺňóôŕšťúýž]/.test(w)).slice(-2).map((w) => w[0]).join('')
  return (
    <div className="person">
      {p.photo_url ? <img src={p.photo_url} alt="" className="photo" /> : <div className="photo">{initials}</div>}
      <div>
        {label && <div className="role" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>}
        <div>
          {p.salutation && <span>{p.salutation} </span>}
          <b>{p.name}</b>
        </div>
        <div className="role">
          {label ? '' : p.role}
          {!label && p.since ? ` · vo farnosti od ${p.since}` : ''}
          {label && p.since ? `dekanom od ${p.since}` : ''}
        </div>
      </div>
    </div>
  )
}
