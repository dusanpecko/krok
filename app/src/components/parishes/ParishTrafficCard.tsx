'use client'

import { useEffect, useState, useTransition } from 'react'
import { BarChart3, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import type { TrafficResult } from '@/lib/parishes/traffic'
import { cardCls, SectionTitle } from '@/components/admin/projects/ui'

type Load = (parishId: string, days: number) => Promise<TrafficResult>

const PERIODS = [7, 30, 90]
const fmt = (n: number) => n.toLocaleString('sk-SK')
const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })

function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev) return <span className="text-xs text-gray-400">predtým bez údajov</span>
  const pct = Math.round(((now - prev) / prev) * 100)
  const up = pct >= 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-700' : 'text-gray-500'}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {up ? '+' : ''}
      {pct} % oproti predch. obdobiu
    </span>
  )
}

/** Denné zobrazenia – jeden rad, tenké stĺpce, tooltip pri prejdení myšou (dataviz: bez legendy, nadpis ho pomenúva). */
function DailyBars({ daily }: { daily: { date: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...daily.map((d) => d.value))
  const h = 140
  return (
    <div className="relative">
      <div className="flex items-end gap-[2px] border-b border-gray-200" style={{ height: h }} onMouseLeave={() => setHover(null)}>
        {daily.map((d, i) => (
          <div key={d.date} className="flex-1 h-full flex items-end cursor-default" onMouseEnter={() => setHover(i)}>
            <div
              className={`w-full rounded-t-[4px] ${hover === i ? 'bg-blue-700' : 'bg-blue-500'}`}
              style={{ height: d.value ? Math.max(2, (d.value / max) * (h - 8)) : 0 }}
            />
          </div>
        ))}
      </div>
      {hover != null && (
        <div
          className="absolute -top-2 -translate-y-full -translate-x-1/2 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold whitespace-nowrap pointer-events-none"
          style={{ left: `${((hover + 0.5) / daily.length) * 100}%` }}
        >
          {dayLabel(daily[hover].date)}: {fmt(daily[hover].value)} zobrazení
        </div>
      )}
      <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
        <span>{dayLabel(daily[0].date)}</span>
        <span>max. {fmt(max)} za deň</span>
        <span>{dayLabel(daily[daily.length - 1].date)}</span>
      </div>
    </div>
  )
}

export default function ParishTrafficCard({ parishId, load }: { parishId: string; load: Load }) {
  const [days, setDays] = useState(30)
  const [res, setRes] = useState<TrafficResult | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => setRes(await load(parishId, days)))
  }, [parishId, days, load])

  return (
    <div className={`${cardCls} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title="Návštevnosť stránky farnosti" description="Koľko ľudí si pozrelo stránku farnosti, oznamy a aktuality (Umami, anonymne – bez cookies a osobných údajov)." />
        <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button key={p} type="button" onClick={() => setDays(p)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${days === p ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {p} dní
            </button>
          ))}
        </div>
      </div>

      {!res || (pending && res.status !== 'ok') ? (
        <div className="py-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
      ) : res.status === 'not_configured' ? (
        <p className="text-sm text-gray-500 flex items-center gap-2"><BarChart3 size={16} /> Štatistiky návštevnosti sa pripravujú.</p>
      ) : res.status === 'no_slug' ? (
        <p className="text-sm text-gray-500">Farnosť zatiaľ nemá verejnú stránku.</p>
      ) : res.status === 'error' ? (
        <p className="text-sm text-red-600 font-bold">{res.message}</p>
      ) : (
        <div className={`space-y-6 ${pending ? 'opacity-50' : ''}`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zobrazenia stránok</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{fmt(res.data.pageviews)}</p>
              <Delta now={res.data.pageviews} prev={res.data.prevPageviews} />
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Návštevy</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{fmt(res.data.visits)}</p>
              <Delta now={res.data.visits} prev={res.data.prevVisits} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 mb-3">
              Zobrazenia po dňoch{res.data.dailyScope === 'home' ? ' – hlavná stránka farnosti' : ''}
            </p>
            <DailyBars daily={res.data.daily} />
          </div>

          {res.data.pages.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Najčítanejšie</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
                    <th className="py-1.5">Stránka</th>
                    <th className="py-1.5 text-right">Zobrazenia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {res.data.pages.map((p) => (
                    <tr key={p.path}>
                      <td className="py-2 pr-3">
                        <a href={p.path} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-blue-600">{p.label}</a>
                      </td>
                      <td className="py-2 text-right font-bold tabular-nums">{fmt(p.pageviews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
