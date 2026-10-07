'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { saveClergy } from '@/app/admin/farnosti/actions'
import { adminUploadParishFile } from '@/app/admin/farnosti/web-actions'
import type { ClergyMember } from '@/lib/parishes/types'
import ClergyPhotoInput from '@/components/parishes/ClergyPhotoInput'
import { btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, checkboxCls, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

const cell = `${inputCls} py-2 px-2.5 text-xs`
const POSITIONS = ['farár', 'farár, dekan', 'farský administrátor', 'farský vikár', 'výpomocný duchovný', 'rektor kostola', 'duchovný správca', 'na odpočinku']

export default function ParishClergyTab({ parishId, initial }: { parishId: string; initial: ClergyMember[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<ClergyMember[]>(initial)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const update = (i: number, patch: Partial<ClergyMember>) => setRows((r) => r.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const n = [...r]
      const j = i + d
      if (j < 0 || j >= n.length) return r
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  const save = () =>
    startTransition(async () => {
      setMsg(null)
      const res = await saveClergy(parishId, rows)
      if (res.success) {
        setMsg({ kind: 'success', text: 'Zoznam kňazov bol uložený.' })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle
        title="Kňazi vo farnosti"
        description="Prevzaté zo schematizmu dcza.sk. Fotku si kňaz zvyčajne nahrá sám v zóne farnosti. Telefón a e-mail kňaza sa na webe zobrazia len so súhlasom („verejný kontakt“)."
      />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <datalist id="clergy-positions">{POSITIONS.map((p) => <option key={p} value={p} />)}</datalist>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
              <th className="py-2 pr-2">Foto</th>
              <th className="py-2 pr-2">Meno</th>
              <th className="py-2 pr-2">Funkcia</th>
              <th className="py-2 pr-2">Telefón</th>
              <th className="py-2 pr-2">E-mail</th>
              <th className="py-2 pr-2 text-center">Verejný kontakt</th>
              <th className="py-2 pr-2">Zdroj</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((c, i) => (
              <tr key={c.id ?? `n${i}`}>
                <td className="py-1.5 pr-2">
                  <ClergyPhotoInput value={c.photo_url} onChange={(url) => update(i, { photo_url: url })} uploader={(fd) => adminUploadParishFile(parishId, fd)} onError={(text) => setMsg({ kind: 'error', text })} size="sm" />
                </td>
                <td className="py-1.5 pr-2"><input value={c.full_name} onChange={(e) => update(i, { full_name: e.target.value })} className={cell} placeholder="Priezvisko Meno" /></td>
                <td className="py-1.5 pr-2"><input value={c.position} onChange={(e) => update(i, { position: e.target.value })} className={cell} list="clergy-positions" /></td>
                <td className="py-1.5 pr-2"><input value={c.phone ?? ''} onChange={(e) => update(i, { phone: e.target.value || null })} className={cell} /></td>
                <td className="py-1.5 pr-2"><input value={c.email ?? ''} onChange={(e) => update(i, { email: e.target.value || null })} className={cell} type="email" /></td>
                <td className="py-1.5 pr-2 text-center"><input type="checkbox" checked={c.is_public} onChange={(e) => update(i, { is_public: e.target.checked })} className={checkboxCls} /></td>
                <td className="py-1.5 pr-2 text-xs text-gray-400">{c.source ?? '—'}</td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  <button type="button" onClick={() => move(i, -1)} className={btnIcon} disabled={i === 0}><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => move(i, 1)} className={btnIcon} disabled={i === rows.length - 1}><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className={btnIconDanger}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">Bez kňazov.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { full_name: '', title_before: null, title_after: null, position: 'farár', phone: null, email: null, photo_url: null, is_public: false, source: 'ručne' }])}
          className={btnSecondary}
        >
          <Plus size={14} /> Pridať kňaza
        </button>
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť kňazov
        </button>
      </div>
    </div>
  )
}
