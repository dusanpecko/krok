'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Bell, Loader2, Save } from 'lucide-react'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import { getParishBoxAdmin, saveParishBox, type ParishBoxAdminView } from '@/app/admin/farnosti/e-zvoncek/actions'
import { computePayout, DEFAULT_BOX_TITLE } from '@/lib/parish-box/types'
import { formatEur } from '@/lib/projects/types'

/** Detail farnosti → E-zvonček: zapnutie, poplatky farnosti a prehľad darov a výplat (len diecéza). */
export default function ParishBoxTab({ parishId, parishSlug }: { parishId: string; parishSlug: string | null }) {
  const [view, setView] = useState<ParishBoxAdminView | null>(null)
  const [form, setForm] = useState({ enabled: false, mollie_fee_pct: '2', fund_fee_pct: '0', title: '', description: '' })
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const load = () =>
    getParishBoxAdmin(parishId).then((v) => {
      setView(v)
      setForm({
        enabled: v.settings.enabled,
        mollie_fee_pct: String(v.settings.mollie_fee_pct),
        fund_fee_pct: String(v.settings.fund_fee_pct),
        title: v.settings.title ?? '',
        description: v.settings.description ?? '',
      })
    })

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parishId])

  if (!view) {
    return (
      <div className={`${cardCls} flex justify-center py-16`}>
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    )
  }

  const num = (v: string) => Number(v.replace(',', '.'))
  const example = computePayout(100, { mollie_fee_pct: num(form.mollie_fee_pct) || 0, fund_fee_pct: num(form.fund_fee_pct) || 0 })

  const save = () =>
    startTransition(async () => {
      setMsg(null)
      const res = await saveParishBox(parishId, {
        enabled: form.enabled,
        mollie_fee_pct: num(form.mollie_fee_pct),
        fund_fee_pct: num(form.fund_fee_pct),
        title: form.title,
        description: form.description,
      })
      if (res.success) {
        setMsg({ kind: 'success', text: 'Nastavenie e-zvončeka je uložené.' })
        load()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <SectionTitle
          title="E-zvonček farnosti"
          description="Online dar pre farnosť (Mollie). Fond peniaze prijme a mesačne ich po odpočítaní poplatkov pošle na IBAN farnosti. Do plnenia predpisu sa nerátajú."
        />

        {!view.ibanValid && (
          <div className="mb-5">
            <Notice kind="error">Farnosť nemá platný IBAN – e-zvonček sa nedá zapnúť. Doplňte ho v záložke Základné údaje.</Notice>
          </div>
        )}

        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input type="checkbox" className={checkboxCls} checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
          <span className="text-sm font-bold text-gray-900">E-zvonček je zapnutý (zobrazí sa na stránke farnosti)</span>
        </label>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Poplatok Mollie (%)" hint={`Predvolené diecézy: ${view.defaults.mollie_fee_pct} %`}>
            <input inputMode="decimal" value={form.mollie_fee_pct} onChange={(e) => setForm((f) => ({ ...f, mollie_fee_pct: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Poplatok fondu (%)" hint={`Predvolené diecézy: ${view.defaults.fund_fee_pct} %`}>
            <input inputMode="decimal" value={form.fund_fee_pct} onChange={(e) => setForm((f) => ({ ...f, fund_fee_pct: e.target.value }))} className={inputCls} />
          </Field>
        </div>
        <p className="text-xs text-gray-500 mb-6 px-1">
          Príklad: zo 100 € dostane farnosť <strong className="text-gray-900">{formatEur(example.net)}</strong> (Mollie {formatEur(example.mollieFee)}, fond {formatEur(example.fundFee)}).
        </p>

        <div className="grid gap-4 mb-6">
          <Field label="Nadpis na stránke farnosti" hint={`Prázdne = „${DEFAULT_BOX_TITLE}“`}>
            <input value={form.title} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={DEFAULT_BOX_TITLE} className={inputCls} />
          </Field>
          <Field label="Text pre darcov (nepovinné)" hint="Napr. na čo farnosť dary použije. Prázdne = predvolený text.">
            <textarea value={form.description} maxLength={600} rows={3} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </Field>
        </div>

        {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť
          </button>
          {parishSlug && view.settings.enabled && (
            <Link href={`/farnosti/${parishSlug}#zvoncek`} target="_blank" className={btnSecondary}>
              <Bell size={14} /> Zobraziť na stránke farnosti
            </Link>
          )}
          <Link href="/admin/farnosti/e-zvoncek" className={btnSecondary}>Mesačné vyúčtovanie</Link>
        </div>
      </div>

      <div className={cardCls}>
        <SectionTitle title="Prehľad" />
        <div className="grid sm:grid-cols-4 gap-4 mb-6">
          {[
            ['Vyzbierané spolu', formatEur(view.totals.gross), `${view.totals.count} darov`],
            ['Čaká na výplatu', formatEur(view.totals.unpaidGross), `${view.totals.unpaidCount} darov`],
            ['Pravidelné dary', String(view.totals.activeRecurring), 'aktívne mesačné'],
            ['Výplaty', String(view.payouts.length), 'za posledné 2 roky'],
          ].map(([label, value, sub]) => (
            <div key={label} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
              <p className="text-xl font-black text-gray-900 mt-1">{value}</p>
              <p className="text-xs text-gray-500">{sub}</p>
            </div>
          ))}
        </div>
        {view.payouts.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="py-2">Mesiac</th>
                <th className="py-2 text-right">Vyzbierané</th>
                <th className="py-2 text-right">Vyplatené</th>
                <th className="py-2 text-right">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {view.payouts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{new Date(p.period_month).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}</td>
                  <td className="py-2 text-right">{formatEur(p.gross_amount)}</td>
                  <td className="py-2 text-right font-bold">{formatEur(p.net_amount)}</td>
                  <td className="py-2 text-right">
                    {p.status === 'sent' ? (
                      <span className="text-emerald-700 font-bold">odoslané {p.sent_at ? new Date(p.sent_at).toLocaleDateString('sk-SK') : ''}</span>
                    ) : (
                      <span className="text-amber-700 font-bold">čaká na odoslanie</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
