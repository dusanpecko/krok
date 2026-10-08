'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Save, Trash2, Copy } from 'lucide-react'
import { saveSchedule } from '@/app/admin/farnosti/actions'
import { DAYS, SERVICE_LABEL, type ParishSeason, type ParishServiceType, type Schedule, type ScheduleItem, type VillageWithStats } from '@/lib/parishes/types'
import { btnIconDanger, btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

const cell = `${inputCls} py-2 px-2.5 text-xs`

const dayOrder = (d: number | null) => (d === null ? 99 : d === 0 ? 7 : d)

const emptyItem = (service_type: ParishServiceType = 'mass'): ScheduleItem => ({
  service_type,
  occasion: 'regular',
  day_of_week: 0,
  day_label: null,
  time_from: null,
  time_to: null,
  relative_note: null,
  note: null,
  village_id: null,
})

export default function ParishScheduleTab({
  parishId,
  schedules,
  villages,
  save: saveAction = saveSchedule,
}: {
  parishId: string
  schedules: Record<ParishSeason, Schedule>
  villages: VillageWithStats[]
  /** Uloženie – admin (predvolené) alebo zóna farnosti */
  save?: (parishId: string, schedule: Schedule) => Promise<{ success: true } | { success: false; error: string }>
}) {
  const router = useRouter()
  const [season, setSeason] = useState<ParishSeason>('regular')
  const [data, setData] = useState<Record<ParishSeason, Schedule>>(schedules)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const current = data[season]
  const setCurrent = (patch: Partial<Schedule>) => setData((d) => ({ ...d, [season]: { ...d[season], ...patch } }))
  const updateItem = (i: number, patch: Partial<ScheduleItem>) => setCurrent({ items: current.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })

  const sortItems = () =>
    setCurrent({
      items: [...current.items].sort(
        (a, b) => a.service_type.localeCompare(b.service_type) || a.occasion.localeCompare(b.occasion) || dayOrder(a.day_of_week) - dayOrder(b.day_of_week) || (a.time_from ?? '').localeCompare(b.time_from ?? '')
      ),
    })

  const copyFromRegular = () => setCurrent({ items: data.regular.items.map((it) => ({ ...it, id: undefined })) })

  const save = () =>
    startTransition(async () => {
      setMsg(null)
      const res = await saveAction(parishId, current)
      if (res.success) {
        setMsg({ kind: 'success', text: season === 'regular' ? 'Rozvrh „cez rok“ bol uložený.' : 'Letný rozvrh bol uložený.' })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  const villageOptions = villages.filter((v) => v.id)

  return (
    <div className={`${cardCls} space-y-5`}>
      <SectionTitle
        title="Bohoslužby, spovedanie a úradné hodiny"
        description="Dva režimy: cez rok a letný (prázdninový). Prvopiatkové spovedanie sa zadáva ako samostatné položky s príležitosťou „prvý piatok“. Úradné hodiny kancelárie zadajte s časom od–do (alebo „po dohode“ do poznámky) – na stránke sa zobrazia pri farskom úrade."
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-fit">
        {(['regular', 'summer'] as ParishSeason[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeason(s)}
            className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer ${season === s ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
          >
            {s === 'regular' ? 'Cez rok' : 'Letný režim'} <span className="text-xs text-gray-400">({data[s].items.length})</span>
          </button>
        ))}
      </div>

      {season === 'summer' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer md:col-span-2">
            <input type="checkbox" checked={current.is_active} onChange={(e) => setCurrent({ is_active: e.target.checked })} className={checkboxCls} />
            Letný režim je zapnutý
          </label>
          <Field label="Platí od"><input type="date" value={current.valid_from ?? ''} onChange={(e) => setCurrent({ valid_from: e.target.value || null })} className={inputCls} /></Field>
          <Field label="Platí do"><input type="date" value={current.valid_to ?? ''} onChange={(e) => setCurrent({ valid_to: e.target.value || null })} className={inputCls} /></Field>
        </div>
      )}

      <Field label="Poznámka k rozvrhu" hint="Napr. „Počas prázdnin neprebieha detská svätá omša.“">
        <input value={current.note ?? ''} onChange={(e) => setCurrent({ note: e.target.value || null })} className={inputCls} />
      </Field>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
              <th className="py-2 pr-2">Druh</th>
              <th className="py-2 pr-2">Príležitosť</th>
              <th className="py-2 pr-2">Deň</th>
              <th className="py-2 pr-2 w-24">Od</th>
              <th className="py-2 pr-2 w-24">Do</th>
              <th className="py-2 pr-2">Namiesto času</th>
              <th className="py-2 pr-2">Miesto</th>
              <th className="py-2 pr-2">Poznámka</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {current.items.map((it, i) => (
              <tr key={it.id ?? `n${i}`}>
                <td className="py-1.5 pr-2">
                  <select value={it.service_type} onChange={(e) => updateItem(i, { service_type: e.target.value as ParishServiceType })} className={cell}>
                    {Object.entries(SERVICE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <select value={it.occasion} onChange={(e) => updateItem(i, { occasion: e.target.value as ScheduleItem['occasion'] })} className={cell}>
                    <option value="regular">bežne</option>
                    <option value="first_friday">prvý piatok</option>
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <select
                    value={it.day_of_week ?? 'label'}
                    onChange={(e) => updateItem(i, e.target.value === 'label' ? { day_of_week: null, day_label: it.day_label ?? 'prikázaný sviatok' } : { day_of_week: Number(e.target.value), day_label: null })}
                    className={cell}
                  >
                    {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    <option value="label">iné…</option>
                  </select>
                  {it.day_of_week === null && (
                    <input value={it.day_label ?? ''} onChange={(e) => updateItem(i, { day_label: e.target.value })} className={`${cell} mt-1`} placeholder="prikázaný sviatok" />
                  )}
                </td>
                <td className="py-1.5 pr-2"><input type="time" value={it.time_from ?? ''} onChange={(e) => updateItem(i, { time_from: e.target.value || null })} className={cell} /></td>
                <td className="py-1.5 pr-2"><input type="time" value={it.time_to ?? ''} onChange={(e) => updateItem(i, { time_to: e.target.value || null })} className={cell} /></td>
                <td className="py-1.5 pr-2">
                  {/* poznámka „pred svätou omšou“ patrí k spovedaniu a pod., nie k samotnej omši */}
                  {it.service_type === 'mass' ? (
                    <input value="" disabled className={cell} placeholder="—" title="Pri svätej omši sa nevypĺňa – zadajte čas" />
                  ) : (
                    <input value={it.relative_note ?? ''} onChange={(e) => updateItem(i, { relative_note: e.target.value || null })} className={cell} placeholder="30 minút pred svätou omšou" />
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  <select value={it.village_id ?? ''} onChange={(e) => updateItem(i, { village_id: e.target.value || null })} className={cell}>
                    <option value="">farský kostol</option>
                    {villageOptions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </td>
                <td className="py-1.5 pr-2"><input value={it.note ?? ''} onChange={(e) => updateItem(i, { note: e.target.value || null })} className={cell} placeholder="detská, len párny týždeň…" /></td>
                <td className="py-1.5 text-right">
                  <button type="button" onClick={() => setCurrent({ items: current.items.filter((_, j) => j !== i) })} className={btnIconDanger}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {current.items.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400">Rozvrh je prázdny.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCurrent({ items: [...current.items, emptyItem('mass')] })} className={btnSecondary}><Plus size={14} /> Sv. omša</button>
          <button type="button" onClick={() => setCurrent({ items: [...current.items, emptyItem('confession')] })} className={btnSecondary}><Plus size={14} /> Spovedanie</button>
          <button type="button" onClick={() => setCurrent({ items: [...current.items, emptyItem('office')] })} className={btnSecondary}><Plus size={14} /> Úradné hodiny</button>
          <button type="button" onClick={sortItems} className={btnSecondary}>Zoradiť</button>
          {season === 'summer' && data.regular.items.length > 0 && (
            <button type="button" onClick={copyFromRegular} className={btnSecondary}><Copy size={14} /> Skopírovať z „cez rok“</button>
          )}
        </div>
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť rozvrh
        </button>
      </div>
    </div>
  )
}
