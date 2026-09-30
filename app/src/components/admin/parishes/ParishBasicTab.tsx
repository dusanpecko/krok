'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { updateParish } from '@/app/admin/farnosti/actions'
import type { ParishKind, ParishRow } from '@/lib/parishes/types'
import { btnPrimary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Form = Record<string, string | boolean>

const toForm = (p: ParishRow): Form => ({
  name: p.name ?? '',
  official_name: p.official_name ?? '',
  kind: p.kind,
  deanery_id: p.deanery_id ?? '',
  patrocinium: p.patrocinium ?? '',
  parish_code: p.parish_code ?? '',
  ico: p.ico ?? '',
  dic: p.dic ?? '',
  street: p.street ?? '',
  postal_code: p.postal_code ?? '',
  city: p.city ?? '',
  district: p.district ?? '',
  email: p.email ?? '',
  phone: p.phone ?? '',
  website: p.website ?? '',
  iban: p.iban ?? '',
  administrator_name: p.administrator_name ?? '',
  feast_day: p.feast_day ?? '',
  feast_day_note: p.feast_day_note ?? '',
  adoration_date: p.adoration_date ?? '',
  adoration_note: p.adoration_note ?? '',
  schematizmus_url: p.schematizmus_url ?? '',
  latitude: p.latitude != null ? String(p.latitude) : '',
  longitude: p.longitude != null ? String(p.longitude) : '',
  intro: p.intro ?? '',
  notes: p.notes ?? '',
  is_active: p.is_active,
  visible_on_web: p.visible_on_web,
})

export default function ParishBasicTab({ parish, deaneries }: { parish: ParishRow; deaneries: { id: string; name: string }[] }) {
  const router = useRouter()
  const [form, setForm] = useState<Form>(() => toForm(parish))
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))
  const text = (k: string, props: Record<string, unknown> = {}) => (
    <input value={String(form[k] ?? '')} onChange={(e) => set(k, e.target.value)} className={inputCls} {...props} />
  )

  const save = () =>
    startTransition(async () => {
      setMsg(null)
      const res = await updateParish(parish.id, form)
      if (res.success) {
        setMsg({ kind: 'success', text: 'Údaje farnosti boli uložené.' })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className="space-y-6">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className={cardCls}>
        <SectionTitle title="Identita" description="Úradné údaje farnosti (register). Zmeny sa zapisujú do histórie." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Názov v Kroku" hint="Zobrazuje sa darcom pri výbere farnosti.">{text('name')}</Field>
          <Field label="Oficiálny názov (schematizmus)">{text('official_name')}</Field>
          <Field label="Typ">
            <select value={String(form.kind)} onChange={(e) => set('kind', e.target.value as ParishKind)} className={inputCls}>
              <option value="parish">Farnosť</option>
              <option value="chaplaincy">Duchovná správa</option>
              <option value="other">Iné</option>
            </select>
          </Field>
          <Field label="Dekanát">
            <select value={String(form.deanery_id)} onChange={(e) => set('deanery_id', e.target.value)} className={inputCls}>
              <option value="">—</option>
              {deaneries.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Kód farnosti">{text('parish_code', { placeholder: '1001' })}</Field>
          <Field label="Patrocínium / farský kostol">{text('patrocinium')}</Field>
          <Field label="IČO">{text('ico', { inputMode: 'numeric' })}</Field>
          <Field label="DIČ">{text('dic', { inputMode: 'numeric' })}</Field>
          <Field label="IBAN" className="md:col-span-2">{text('iban', { placeholder: 'SK…' })}</Field>
          <Field label="Správca farnosti (úradný záznam)" className="md:col-span-2" hint="Zoznam všetkých kňazov je v záložke Kňazi.">{text('administrator_name')}</Field>
        </div>
      </div>

      <div className={cardCls}>
        <SectionTitle title="Kontakt a adresa" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Ulica" className="md:col-span-2">{text('street')}</Field>
          <Field label="PSČ">{text('postal_code', { placeholder: '010 01' })}</Field>
          <Field label="Obec / pošta">{text('city')}</Field>
          <Field label="Okres">{text('district')}</Field>
          <Field label="Telefón">{text('phone')}</Field>
          <Field label="E-mail">{text('email', { type: 'email' })}</Field>
          <Field label="Web" className="md:col-span-2">{text('website', { placeholder: 'www.farnost.sk' })}</Field>
          <Field label="Odkaz na schematizmus" className="md:col-span-3">{text('schematizmus_url')}</Field>
          <Field label="GPS šírka">{text('latitude', { inputMode: 'decimal', placeholder: '49.2231' })}</Field>
          <Field label="GPS dĺžka">{text('longitude', { inputMode: 'decimal', placeholder: '18.7394' })}</Field>
        </div>
      </div>

      <div className={cardCls}>
        <SectionTitle title="Sviatky farnosti" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Hody (dátum)">{text('feast_day', { type: 'date' })}</Field>
          <Field label="Hody – poznámka" hint="Ak je sviatok pohyblivý, napr. „nedeľa po 15. 8.“">{text('feast_day_note')}</Field>
          <Field label="Výročná celodenná poklona (dátum)">{text('adoration_date', { type: 'date' })}</Field>
          <Field label="Výročná poklona – poznámka">{text('adoration_note', { placeholder: '1. septembrová nedeľa' })}</Field>
        </div>
      </div>

      <div className={cardCls}>
        <SectionTitle title="Web a interné" />
        <div className="space-y-4">
          <Field label="Krátky text na verejnú stránku farnosti">
            <textarea value={String(form.intro)} onChange={(e) => set('intro', e.target.value)} rows={3} className={inputCls} />
          </Field>
          <Field label="Interná poznámka" hint="Nezobrazuje sa farnosti ani na webe.">
            <textarea value={String(form.notes)} onChange={(e) => set('notes', e.target.value)} rows={3} className={inputCls} />
          </Field>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => set('is_active', e.target.checked)} className={checkboxCls} />
              Aktívna (ponúka sa darcom pri výbere farnosti)
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={Boolean(form.visible_on_web)} onChange={(e) => set('visible_on_web', e.target.checked)} className={checkboxCls} />
              Verejná stránka farnosti zapnutá
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť údaje
        </button>
      </div>
    </div>
  )
}
