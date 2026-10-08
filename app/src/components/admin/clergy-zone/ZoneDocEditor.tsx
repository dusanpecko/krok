'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Archive, CheckCircle2, Eye, EyeOff, FileSearch, FileText, Loader2, Mail, Save, Send, Trash2, Upload, X } from 'lucide-react'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import {
  deleteZoneDoc, deleteZoneFile, finishZoneUpload, moveZoneFile, prepareZoneUpload, publishZoneDoc, saveZoneDoc,
} from '@/app/admin/knazska-zona/actions'
import { FILE_KIND_LABEL, fileKind, fmtDate, formatBytes, type AdminZoneDoc, type ZoneCategory, type ZoneDocInput } from '@/lib/clergy-zone/types'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
type UploadItem = { name: string; pct: number; state: 'uploading' | 'processing' | 'done' | 'error'; error?: string }

/** PUT priamo do úložiska podpísanou adresou – s priebehom (fetch priebeh nahrávania nevie). */
function putWithProgress(url: string, file: File, onPct: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Úložisko vrátilo ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('Výpadok spojenia'))
    xhr.send(file)
  })
}

export default function ZoneDocEditor({ doc, categories }: { doc: AdminZoneDoc | null; categories: ZoneCategory[] }) {
  const router = useRouter()
  const [form, setForm] = useState<ZoneDocInput>(
    doc
      ? { id: doc.id, category_id: doc.category_id, title: doc.title, doc_number: doc.doc_number, issued_on: doc.issued_on, summary: doc.summary, body: doc.body, status: doc.status }
      : { category_id: categories.find((c) => c.slug === 'obezniky')?.id ?? categories[0]?.id ?? '', title: '', doc_number: '', issued_on: new Date().toISOString().slice(0, 10), summary: '', body: '', status: 'current' }
  )
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()
  const [queue, setQueue] = useState<UploadItem[]>([])
  const [drag, setDrag] = useState(false)
  const [notify, setNotify] = useState(!doc?.notified_at)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof ZoneDocInput>(k: K, v: ZoneDocInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const uploading = queue.some((q) => q.state === 'uploading' || q.state === 'processing')

  const save = () =>
    start(async () => {
      const res = await saveZoneDoc(form)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      if (!doc) return router.replace(`/admin/knazska-zona/${res.id}?novy=1`)
      setMsg({ kind: 'success', text: 'Uložené.' })
      router.refresh()
    })

  const upload = async (files: File[]) => {
    if (!doc || !files.length) return
    setMsg(null)
    setQueue(files.map((f) => ({ name: f.name, pct: 0, state: 'uploading' })))
    const upd = (i: number, p: Partial<UploadItem>) => setQueue((q) => q.map((x, j) => (j === i ? { ...x, ...p } : x)))
    let failed = 0
    for (const [i, f] of files.entries()) {
      try {
        const prep = await prepareZoneUpload(doc.id, f.name, f.type, f.size)
        if (!prep.success) throw new Error(prep.error)
        await putWithProgress(prep.url, f, (pct) => upd(i, { pct }))
        upd(i, { state: 'processing', pct: 100 })
        const fin = await finishZoneUpload(doc.id, prep.key, f.name, f.type)
        if (!fin.success) throw new Error(fin.error)
        upd(i, { state: 'done' })
      } catch (e) {
        failed++
        upd(i, { state: 'error', error: e instanceof Error ? e.message : 'Chyba' })
      }
    }
    router.refresh()
    if (!failed) setTimeout(() => setQueue([]), 1500)
  }

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn()
      setMsg(res.success ? { kind: 'success', text: ok } : { kind: 'error', text: res.error ?? 'Chyba' })
      if (res.success) router.refresh()
    })

  const publish = (publishIt: boolean, resend = false) =>
    start(async () => {
      const res = await publishZoneDoc(doc!.id, { publish: publishIt, notify: publishIt && (notify || resend), resend })
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      const mail = res.sent != null ? ` E-mail odoslaný ${res.sent} kňazom${res.failed ? `, ${res.failed} zlyhalo` : ''}${res.withoutEmail ? `, ${res.withoutEmail} bez e-mailu` : ''}.` : ''
      setMsg({ kind: 'success', text: publishIt ? `Zverejnené.${mail}` : 'Dokument je skrytý (koncept).' })
      router.refresh()
    })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/admin/knazska-zona" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Kňazská zóna
      </Link>

      <div className={`${cardCls} space-y-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-black text-gray-900">{doc ? doc.title : 'Nový dokument'}</h1>
          {doc && (
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${doc.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {doc.published ? (doc.status === 'archived' ? 'Zverejnené – archív' : 'Zverejnené') : 'Koncept – kňazi ho nevidia'}
            </span>
          )}
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

        <div className="grid md:grid-cols-[1fr_220px] gap-4">
          <Field label="Názov">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="napr. Obežník k Adventu a Vianociam 2026" maxLength={300} />
          </Field>
          <Field label="Kategória">
            <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_visible ? '' : ' (skrytá)'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Číslo (nepovinné)" hint="Napr. číslo obežníka 7/2026">
            <input value={form.doc_number ?? ''} onChange={(e) => set('doc_number', e.target.value)} className={inputCls} maxLength={50} />
          </Field>
          <Field label="Dátum vydania">
            <input type="date" value={form.issued_on ?? ''} onChange={(e) => set('issued_on', e.target.value || null)} className={inputCls} />
          </Field>
          <Field label="Stav" hint="Obežníky platia stále – archivovaný dokument sa presunie do Archívu.">
            <select value={form.status} onChange={(e) => set('status', e.target.value as ZoneDocInput['status'])} className={inputCls}>
              <option value="current">Aktuálne</option>
              <option value="archived">Archív</option>
            </select>
          </Field>
        </div>
        <Field label="Krátky popis (nepovinné)" hint="Zobrazí sa v zozname a v e-maile kňazom.">
          <textarea rows={2} value={form.summary ?? ''} onChange={(e) => set('summary', e.target.value)} className={inputCls} maxLength={1000} />
        </Field>
        <SimpleRichTextEditor label="Text dokumentu (nepovinné – ak je obežník len v PDF, netreba)" value={form.body ?? ''} onChange={(v) => set('body', v)} minHeight="200px" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {doc ? 'Uložiť zmeny' : 'Uložiť a pokračovať súbormi'}
          </button>
          {doc && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                confirm(`Naozaj zmazať „${doc.title}“ aj so súbormi?`) &&
                start(async () => {
                  const res = await deleteZoneDoc(doc.id)
                  if (!res.success) return setMsg({ kind: 'error', text: res.error })
                  router.replace('/admin/knazska-zona')
                })
              }
              className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}
            >
              <Trash2 size={14} /> Zmazať dokument
            </button>
          )}
        </div>
      </div>

      {doc && (
        <>
          <div
            className={`${cardCls} space-y-4 border-2 border-dashed ${drag ? '!border-blue-400 !bg-blue-50' : '!border-gray-200'}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              if (!uploading) void upload(Array.from(e.dataTransfer.files))
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-gray-900">Súbory</p>
                <p className="text-xs text-gray-400">PDF, Word, Excel… do 100 MB. Text z PDF a DOCX sa načíta na vyhľadávanie (naskenované PDF a starý .doc len podľa názvu).</p>
              </div>
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={btnSecondary}>
                <Upload size={14} /> Pridať súbory
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  void upload(files)
                }}
              />
            </div>
            {doc.files.length === 0 && queue.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Pretiahnite sem súbory alebo použite „Pridať súbory“.</p>}
            {doc.files.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {doc.files.map((f, i) => (
                  <li key={f.id} className="py-2.5 flex items-center gap-3">
                    <FileText size={18} className="text-gray-300" />
                    <div className="flex-1 min-w-0">
                      <a href={`/knazska-zona/subor/${f.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-gray-900 hover:text-blue-600 truncate block">
                        {f.file_name}
                      </a>
                      <p className="text-xs text-gray-400">
                        {FILE_KIND_LABEL[fileKind(f.file_name, f.mime_type)]} · {formatBytes(f.size_bytes)} ·{' '}
                        {f.has_text ? (
                          <span className="text-emerald-600 inline-flex items-center gap-1">
                            <FileSearch size={11} /> text na vyhľadávanie načítaný
                          </span>
                        ) : (
                          <span className="text-amber-600">bez textu – nájde sa len podľa názvu</span>
                        )}
                      </p>
                    </div>
                    <button type="button" disabled={pending || i === 0} onClick={() => run(() => moveZoneFile(f.id, -1), 'Poradie uložené.')} className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer">
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={pending || i === doc.files.length - 1}
                      onClick={() => run(() => moveZoneFile(f.id, 1), 'Poradie uložené.')}
                      className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => confirm(`Zmazať súbor ${f.file_name}?`) && run(() => deleteZoneFile(f.id), 'Súbor zmazaný.')}
                      className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {queue.length > 0 && (
              <ul className="space-y-2">
                {queue.map((q, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      {q.state === 'done' ? <CheckCircle2 size={14} className="text-emerald-600" /> : q.state === 'error' ? <X size={14} className="text-red-600" /> : <Loader2 size={14} className="animate-spin text-blue-600" />}
                      <span className="truncate flex-1">{q.name}</span>
                      <span className="text-xs text-gray-400">{q.state === 'processing' ? 'spracúvam text…' : q.state === 'uploading' ? `${q.pct} %` : ''}</span>
                    </div>
                    {q.state === 'uploading' && (
                      <div className="h-1 rounded-full bg-gray-100 mt-1 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${q.pct}%` }} />
                      </div>
                    )}
                    {q.error && <p className="text-xs text-red-600 mt-0.5">{q.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${cardCls} space-y-4`}>
            <p className="font-black text-gray-900">Zverejnenie</p>
            {doc.published ? (
              <>
                <p className="text-sm text-gray-600">
                  Zverejnené {fmtDate(doc.published_at)}.{' '}
                  {doc.notified_at ? `E-mail odišiel ${fmtDate(doc.notified_at)} (${doc.notified_count ?? 0} kňazom).` : 'E-mail kňazom sa neposielal.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={`/knazska-zona/dokument/${doc.id}`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                    <Eye size={14} /> Zobraziť v zóne
                  </a>
                  <button type="button" disabled={pending} onClick={() => publish(false)} className={btnSecondary}>
                    <EyeOff size={14} /> Skryť (koncept)
                  </button>
                  {form.status === 'current' && (
                    <button type="button" disabled={pending} onClick={() => run(() => saveZoneDoc({ ...form, status: 'archived' }), 'Presunuté do archívu.')} className={btnSecondary}>
                      <Archive size={14} /> Presunúť do archívu
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirm(doc.notified_at ? 'E-mail už raz odišiel. Poslať ho všetkým kňazom znova?' : 'Poslať e-mail všetkým kňazom?') && publish(true, true)}
                    className={btnSecondary}
                  >
                    <Mail size={14} /> {doc.notified_at ? 'Poslať e-mail znova' : 'Poslať e-mail kňazom'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className={checkboxCls} />
                  Poslať e-mail kňazom (odkaz do zóny, dokument sa neprikladá)
                </label>
                <button
                  type="button"
                  disabled={pending || uploading}
                  onClick={() => (!notify || confirm('Zverejniť a poslať e-mail všetkým kňazom a diakonom?')) && publish(true)}
                  className={btnPrimary}
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Zverejniť v kňazskej zóne
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
