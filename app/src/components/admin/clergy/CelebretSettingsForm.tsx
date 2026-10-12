'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { btnPrimary, cardCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import { saveCelebretSettings } from '@/app/admin/knazi/celebrety/actions'
import type { CelebretSettings } from '@/lib/clergy/celebret'

const IMAGES = [
  { key: 'logo', label: 'Logo / erb diecézy', hint: 'Hore na celebrete.' },
  { key: 'stamp', label: 'Pečiatka', hint: 'PNG s priehľadným pozadím.' },
  { key: 'signature', label: 'Podpis', hint: 'Naskenovaný podpis, PNG s priehľadným pozadím.' },
] as const

/**
 * Nastavenia celebretu (O57): každé uloženie vytvorí novú verziu – už vydané celebrety si nechajú
 * podpis a pečiatku, s ktorými boli vydané (napr. pri zmene biskupa).
 */
export default function CelebretSettingsForm({ history }: { history: CelebretSettings[] }) {
  const router = useRouter()
  const current = history[0] ?? null
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const submit = (form: FormData) =>
    startTransition(async () => {
      setMsg(null)
      const res = await saveCelebretSettings(form)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setMsg({ kind: 'success', text: 'Uložené ako nová verzia – použije sa pri ďalších vydaných celebretoch.' })
      router.refresh()
    })

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/admin/knazi/celebrety" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Celebrety
      </Link>
      <div>
        <h1 className="text-2xl font-black text-gray-900">Nastavenia celebretu</h1>
        <p className="text-sm text-gray-500 mt-1">Pri každom uložení vznikne nová verzia. Už vydané celebrety sa nezmenia – zostane na nich podpis a pečiatka z čias vydania (O57).</p>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <form action={submit} className={`${cardCls} space-y-6`}>
        <SectionTitle title="Obrázky" description="Nový súbor nahraďte len vtedy, keď sa mení (napr. nový biskup = nový podpis). Prázdne pole = ostáva súčasný obrázok." />
        <div className="grid sm:grid-cols-3 gap-5">
          {IMAGES.map((i) => {
            const url = current?.[`${i.key}_url` as const]
            return (
              <div key={i.key} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{i.label}</p>
                <div className="h-28 rounded-2xl border border-dashed border-gray-200 bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:16px_16px] flex items-center justify-center">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="max-h-24 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">chýba</span>
                  )}
                </div>
                <input type="file" name={i.key} accept="image/png,image/webp,image/jpeg" className="text-xs w-full" />
                <p className="text-[11px] text-gray-400">{i.hint}</p>
              </div>
            )
          })}
        </div>

        <SectionTitle title="Podpis a kontakt" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Meno podpisujúceho (nepovinné)" hint="Pod podpisom; prázdne = „subscriptio“">
            <input name="signer_name" defaultValue={current?.signer_name ?? ''} className={inputCls} placeholder="Mons. Tomáš Galis" />
          </Field>
          <Field label="Funkcia (nepovinné)">
            <input name="signer_function" defaultValue={current?.signer_function ?? ''} className={inputCls} placeholder="Episcopus Žilinensis" />
          </Field>
          <Field label="Adresa kúrie" className="sm:col-span-2">
            <input name="curia_address" defaultValue={current?.curia_address ?? 'Jána Kalinčiaka 1, 010 01 Žilina'} className={inputCls} />
          </Field>
          <Field label="Telefón">
            <input name="curia_phone" defaultValue={current?.curia_phone ?? '+421 41 500 22 15'} className={inputCls} />
          </Field>
          <Field label="E-mail">
            <input name="curia_email" defaultValue={current?.curia_email ?? 'sekretariat@dcza.sk'} className={inputCls} />
          </Field>
          <Field label="Web (rub karty)">
            <input name="curia_web" defaultValue={current?.curia_web ?? 'www.dcza.sk'} className={inputCls} />
          </Field>
        </div>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť novú verziu
        </button>
      </form>

      {history.length > 1 && (
        <div className={cardCls}>
          <SectionTitle title="Predchádzajúce verzie" />
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {history.slice(1).map((h) => (
              <li key={h.id} className="py-2 flex items-center gap-3">
                <span className="text-gray-500 w-36">{new Date(h.created_at).toLocaleDateString('sk-SK')}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {h.signature_url && <img src={h.signature_url} alt="" className="h-8 object-contain" />}
                <span className="text-gray-700">{h.signer_name ?? ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
