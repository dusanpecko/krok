'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, EyeOff, ImagePlus, ListPlus, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { adminDeleteAward, adminMoveAward, adminSaveAward, adminUploadDioceseImage } from '@/app/admin/web-dieceza/actions'
import { AWARD_GRANTOR_LABEL, type AdminAward, type AwardGrantor, type AwardInput, type AwardRecipientInput, type AwardsAdminData } from '@/lib/diocese/awards'
import { btnIcon, btnIconDanger, btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
type Form = AwardInput & { id: string | null }

const GRANTORS: AwardGrantor[] = ['papez', 'biskup']
const emptyRecipient = (): AwardRecipientInput => ({ name: '', clergy_id: null, deceased: false, year: null, note: null })
const empty = (): Form => ({ id: null, name: '', grantor: 'papez', description: '', image_url: '', album_id: null, published: true, recipients: [emptyRecipient()] })
const toForm = (a: AdminAward): Form => ({ id: a.id, name: a.name, grantor: a.grantor, description: a.description, image_url: a.image_url, album_id: a.album_id, published: a.published, recipients: a.recipients.length ? a.recipients : [emptyRecipient()] })

/** „Mons. Ján Novák +“ → zosnulý; jeden ocenený na riadok. */
function parseList(text: string): AwardRecipientInput[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean)
    .map((l) => {
      const deceased = /\s*(\+|†)\s*$/.test(l)
      return { ...emptyRecipient(), name: l.replace(/\s*(\+|†)\s*$/, ''), deceased }
    })
}

/** Ocenenia a vyznamenania – stránka Diecéza → Ocenenia na dcza.sk (063). */
export default function AwardsAdmin({ data }: { data: AwardsAdminData }) {
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [bulk, setBulk] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const setRecipient = (i: number, patch: Partial<AwardRecipientInput>) =>
    setForm((f) => (f ? { ...f, recipients: f.recipients.map((r, k) => (k === i ? { ...r, ...patch } : r)) } : f))
  const moveRecipient = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      if (!f || i + dir < 0 || i + dir >= f.recipients.length) return f
      const list = [...f.recipients]
      ;[list[i], list[i + dir]] = [list[i + dir], list[i]]
      return { ...f, recipients: list }
    })

  const upload = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await adminUploadDioceseImage(fd)
    setUploading(false)
    if (res.error || !res.url) return setMsg({ kind: 'error', text: res.error ?? 'Nahratie zlyhalo.' })
    set('image_url', res.url)
  }

  const pickClergy = (i: number, clergyId: string) => {
    const opt = data.clergyOptions.find((o) => o.id === clergyId)
    const current = form?.recipients[i]
    setRecipient(i, {
      clergy_id: clergyId || null,
      ...(opt && !current?.name.trim() ? { name: opt.label.replace(/ †$/, '') } : {}),
    })
  }

  const save = () =>
    start(async () => {
      if (!form) return
      const { id, ...input } = form
      const res = await adminSaveAward(id, input)
      if (!res.success) return setMsg({ kind: 'error', text: res.error })
      setForm(null)
      setMsg({ kind: 'success', text: 'Uložené.' })
      router.refresh()
    })

  const move = (a: AdminAward, dir: -1 | 1) =>
    start(async () => {
      const res = await adminMoveAward(a.id, dir)
      if (!res.success) setMsg({ kind: 'error', text: res.error })
      router.refresh()
    })

  const remove = (a: AdminAward) =>
    confirm(`Zmazať ocenenie „${a.name}“ aj so zoznamom ocenených?`) &&
    start(async () => {
      const res = await adminDeleteAward(a.id)
      setMsg(res.success ? { kind: 'success', text: 'Zmazané.' } : { kind: 'error', text: res.error })
      if (form?.id === a.id) setForm(null)
      router.refresh()
    })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Web diecézy dcza.sk</p>
          <h1 className="text-2xl font-black text-gray-900">Ocenenia a vyznamenania</h1>
          <p className="text-sm text-gray-500 mt-1">Pápežské a diecézne ocenenia so zoznamom ocenených. Na webe v časti Diecéza → Ocenenia, vyznamenania.</p>
        </div>
        <button type="button" onClick={() => setForm(empty())} className={btnPrimary}>
          <Plus size={16} /> Pridať ocenenie
        </button>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {form && (
        <div className={`${cardCls} space-y-5`}>
          <div className="flex items-center justify-between">
            <SectionTitle title={form.id ? `Upraviť: ${form.name}` : 'Nové ocenenie'} />
            <button type="button" onClick={() => setForm(null)} className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className="grid md:grid-cols-[180px_1fr] gap-6">
            <div>
              <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <ImagePlus size={28} className="text-gray-300" />
                )}
              </div>
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${btnSecondary} w-full mt-2`}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {form.image_url ? 'Zmeniť obrázok' : 'Obrázok (nepovinné)'}
              </button>
              {form.image_url && (
                <button type="button" onClick={() => set('image_url', '')} className="w-full mt-1 text-xs text-gray-400 hover:text-red-600 cursor-pointer">
                  Odstrániť obrázok
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void upload(f)
                }}
              />
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-[1fr_220px] gap-4">
                <Field label="Názov ocenenia">
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} maxLength={200} placeholder="Pro Ecclesia et Pontifice" />
                </Field>
                <Field label="Udeľuje">
                  <select value={form.grantor} onChange={(e) => set('grantor', e.target.value as AwardGrantor)} className={inputCls}>
                    {GRANTORS.map((g) => <option key={g} value={g}>{g === 'papez' ? 'Svätý Otec' : 'Diecézny biskup'}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Popis (nepovinné)" hint="Odseky oddeľte prázdnym riadkom.">
                <textarea rows={5} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className={inputCls} maxLength={5000} />
              </Field>
              <Field label="Fotogaléria (nepovinné)" hint="Album z Web diecézy → Galéria – zobrazí sa pri ocenení ako odkaz s náhľadom.">
                <select value={form.album_id ?? ''} onChange={(e) => set('album_id', e.target.value || null)} className={inputCls}>
                  <option value="">— bez galérie —</option>
                  {data.albumOptions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className={checkboxCls} /> Zverejnené na webe
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle title={`Ocenení (${form.recipients.filter((r) => r.name.trim()).length})`} description="Meno s titulmi tak, ako sa má zobraziť. Kňazovi z registra vyberte záznam – na webe bude odkaz na jeho profil a † podľa registra." />
              <button type="button" onClick={() => setBulk(bulk === null ? '' : null)} className={btnSecondary}>
                <ListPlus size={14} /> Vložiť zoznam
              </button>
            </div>
            {bulk !== null && (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                <textarea rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} className={inputCls} placeholder={'Jeden ocenený na riadok, zosnulý s „+“ na konci:\nMUDr. Viera Belková\nMgr. Ľudovít Lajčin +'} />
                <button
                  type="button"
                  disabled={!bulk.trim()}
                  onClick={() => {
                    const added = parseList(bulk)
                    setForm((f) => (f ? { ...f, recipients: [...f.recipients.filter((r) => r.name.trim()), ...added] } : f))
                    setBulk(null)
                  }}
                  className={btnSecondary}
                >
                  <Plus size={14} /> Pridať do zoznamu
                </button>
              </div>
            )}
            <div className="space-y-2">
              {form.recipients.map((r, i) => (
                <div key={i} className="grid gap-2 items-center rounded-xl border border-gray-100 p-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_90px_minmax(0,1fr)_auto]">
                  <input value={r.name} onChange={(e) => setRecipient(i, { name: e.target.value })} className={inputCls} placeholder="Meno s titulmi" maxLength={300} />
                  <select value={r.clergy_id ?? ''} onChange={(e) => pickClergy(i, e.target.value)} className={inputCls} title="Kňaz alebo diakon z registra">
                    <option value="">— nie je v registri —</option>
                    {data.clergyOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <input
                    inputMode="numeric"
                    value={r.year ?? ''}
                    onChange={(e) => setRecipient(i, { year: /^\d{1,4}$/.test(e.target.value) ? Number(e.target.value) : null })}
                    className={inputCls}
                    placeholder="Rok"
                    maxLength={4}
                  />
                  <input value={r.note ?? ''} onChange={(e) => setRecipient(i, { note: e.target.value })} className={inputCls} placeholder="Poznámka" maxLength={300} />
                  <div className="flex items-center gap-1 justify-end">
                    <label className="flex items-center gap-1 px-2 text-xs font-bold text-gray-500 cursor-pointer" title="Zosnulý">
                      <input type="checkbox" checked={r.deceased} onChange={(e) => setRecipient(i, { deceased: e.target.checked })} className={checkboxCls} /> †
                    </label>
                    <button type="button" onClick={() => moveRecipient(i, -1)} disabled={i === 0} className={btnIcon} title="Vyššie"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => moveRecipient(i, 1)} disabled={i === form.recipients.length - 1} className={btnIcon} title="Nižšie"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => setForm((f) => (f ? { ...f, recipients: f.recipients.filter((_, k) => k !== i) } : f))} className={btnIconDanger} title="Odstrániť"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => set('recipients', [...form.recipients, emptyRecipient()])} className={btnSecondary}>
              <Plus size={14} /> Pridať oceneného
            </button>
          </div>

          <button type="button" onClick={save} disabled={pending || uploading} className={btnPrimary}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Uložiť
          </button>
        </div>
      )}

      {GRANTORS.map((g) => {
        const list = data.awards.filter((a) => a.grantor === g)
        if (!list.length) return null
        return (
          <div key={g} className={cardCls}>
            <SectionTitle title={AWARD_GRANTOR_LABEL[g]} />
            <div className="divide-y divide-gray-100">
              {list.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 flex items-center gap-2">
                      {a.name}
                      {!a.published && (
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold inline-flex items-center gap-1">
                          <EyeOff size={10} /> skryté
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ocenení: {a.recipients.length}
                      {a.album_id ? ' · s fotogalériou' : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => move(a, -1)} disabled={pending || i === 0} className={btnIcon} title="Vyššie"><ArrowUp size={16} /></button>
                  <button type="button" onClick={() => move(a, 1)} disabled={pending || i === list.length - 1} className={btnIcon} title="Nižšie"><ArrowDown size={16} /></button>
                  <button type="button" onClick={() => { setForm(toForm(a)); setBulk(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className={btnIcon} title="Upraviť"><Pencil size={16} /></button>
                  <button type="button" onClick={() => remove(a)} className={btnIconDanger} title="Zmazať"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
