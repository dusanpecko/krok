'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, ExternalLink, FileText, IdCard, Loader2, Plus, Printer, Upload, XCircle } from 'lucide-react'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'
import { shrinkForUpload } from '@/lib/shrink-image'
import CopyLinkButton from '@/components/celebret/CopyLinkButton'
import { issueCelebretAction, reviewPhotoRequest, revokeCelebret, uploadClergyPhoto, type ClergyCelebretData } from '@/app/admin/knazi/celebrety/actions'

const fmt = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)}. ${Number(m)}. ${y}`
}
const STATE: Record<string, { label: string; cls: string }> = {
  valid: { label: 'platný', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired: { label: 'vypršal', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  revoked: { label: 'zrušený', cls: 'bg-red-50 text-red-700 border-red-200' },
}

/** Záložka Celebret v detaile kňaza (K6): fotka, vydanie, zoznam celebretov, tlač, zrušenie. */
export default function CelebretTab({ clergyId, data, celebretBase }: { clergyId: string; data: ClergyCelebretData; celebretBase: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [issuedOn, setIssuedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [confession, setConfession] = useState(true)
  const [note, setNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().slice(0, 10)
  const current = data.celebrets.find((c) => c.state === 'valid')

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      setMsg(null)
      const res = await fn()
      if (!res.success) return setMsg({ kind: 'error', text: res.error ?? 'Chyba.' })
      setMsg({ kind: 'success', text: ok })
      router.refresh()
    })

  const upload = async (file: File) => {
    const form = new FormData()
    form.set('file', await shrinkForUpload(file, 1600))
    run(() => uploadClergyPhoto(clergyId, form), 'Fotka bola uložená – použije sa pri ďalšom vydaní celebretu.')
  }

  return (
    <div className="space-y-6">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {!data.eligible && <Notice kind="info">Celebret sa vydáva len kňazom (a biskupovi) v službe, na odpočinku alebo na štúdiu (O53).</Notice>}
      {!data.hasSettings && (
        <Notice kind="info">
          Najprv nahrajte logo, pečiatku a podpis v <Link href="/admin/knazi/celebrety/nastavenia" className="font-bold underline">nastaveniach celebretu</Link>.
        </Notice>
      )}

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <div className={`${cardCls} text-center space-y-3`}>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Fotka na celebret</p>
          {data.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photo_url} alt="" className="w-36 h-36 rounded-full object-cover mx-auto border" />
          ) : (
            <div className="w-36 h-36 rounded-full bg-gray-100 mx-auto flex items-center justify-center text-xs text-gray-400">bez fotky</div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className={btnSecondary}>
            <Upload size={14} /> {data.photo_url ? 'Zmeniť fotku' : 'Nahrať fotku'}
          </button>
          <p className="text-[11px] text-gray-400">Portrét, oreže sa na štvorec. Verejne len na celebrete, nie v schematizme.</p>
          {data.pendingPhoto && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p className="text-xs font-bold text-amber-800">Kňaz poslal novú fotku</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.pendingPhoto.photo_url} alt="" className="w-24 h-24 rounded-full object-cover mx-auto" />
              <div className="flex justify-center gap-2">
                <button type="button" disabled={pending} onClick={() => run(() => reviewPhotoRequest(data.pendingPhoto!.id, true), 'Fotka schválená.')} className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-100 cursor-pointer" title="Schváliť">
                  <CheckCircle2 size={18} />
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => reviewPhotoRequest(data.pendingPhoto!.id, false, prompt('Dôvod (uvidí ho kňaz):') ?? ''), 'Fotka zamietnutá.')} className="p-2 rounded-lg text-red-600 hover:bg-red-100 cursor-pointer" title="Zamietnuť">
                  <XCircle size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={cardCls}>
          <SectionTitle
            title="Vydať celebret"
            description={current ? `Platný celebret ${current.number} do ${fmt(current.valid_until)}. Nový celebret ho nezruší – starý vyprší sám, prípadne ho zrušte.` : 'Platnosť je vždy 1 rok od vydania (O55). Pri vydaní sa použije fotka vľavo a aktuálna pečiatka a podpis.'}
          />
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="Dátum vydania">
              <input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Poznámka (interná)">
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </Field>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={confession} onChange={(e) => setConfession(e.target.checked)} className={checkboxCls} />
              Má spovednú jurisdikciu (veta „iurisdictione ad confessiones audiendas præditus“ v texte)
            </label>
          </div>
          <button
            type="button"
            disabled={pending || !data.eligible}
            onClick={() => run(() => issueCelebretAction(clergyId, { issued_on: issuedOn, confession_jurisdiction: confession, note }), 'Celebret bol vydaný.')}
            className={`${btnPrimary} mt-4`}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Vydať celebret
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <SectionTitle title="Vydané celebrety" description="Každý celebret má vlastný QR kód. Zrušený alebo vypršaný sa pri overení zobrazí ako NON VALET." />
        {data.celebrets.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">Zatiaľ žiadny celebret.</p>
        ) : (
          <ul className="divide-y divide-gray-100 mt-3">
            {data.celebrets.map((c) => (
              <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <IdCard size={20} className="text-gray-400" />
                  <div>
                    <p className="font-bold text-gray-900">
                      {c.number}{' '}
                      <span className={`ml-1 px-2 py-0.5 rounded-full border text-xs ${STATE[c.state].cls}`}>{STATE[c.state].label}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      vydaný {fmt(c.issued_on)} · platí do {fmt(c.valid_until)}
                      {c.revoked_reason ? ` · zrušený: ${c.revoked_reason}` : ''}
                      {c.valid_until < today && !c.revoked_at ? ' · vypršal' : ''}
                    </p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5 select-all break-all">{`${celebretBase}/${c.token}`}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`${celebretBase}/${c.token}`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                    <ExternalLink size={14} /> Overenie
                  </a>
                  <CopyLinkButton url={`${celebretBase}/${c.token}`} className={btnSecondary} />
                  <a href={`/celebret-tlac?ids=${c.id}&format=plast`} target="_blank" className={btnSecondary}>
                    <IdCard size={14} /> Plastová karta
                  </a>
                  <a href={`/celebret-tlac?ids=${c.id}`} target="_blank" className={btnSecondary}>
                    <Printer size={14} /> Na papier
                  </a>
                  <a href={`/celebret-tlac?ids=${c.id}&format=a4`} target="_blank" className={btnSecondary}>
                    <FileText size={14} /> A4
                  </a>
                  {c.state === 'valid' && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const reason = prompt('Dôvod zrušenia (zobrazí sa len v admine):')
                        if (reason !== null) run(() => revokeCelebret(c.id, reason), 'Celebret bol zrušený.')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Ban size={14} /> Zrušiť
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
