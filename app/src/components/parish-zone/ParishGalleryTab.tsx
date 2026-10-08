'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Ban, ExternalLink, Eye, EyeOff, Images, Link2, Loader2, Pencil, Plus, Save, ShieldCheck, Star, Trash2, Upload, X } from 'lucide-react'
import type { AlbumInput, GalleryAlbum, GalleryOverview, GalleryPhoto } from '@/lib/parishes/gallery'
import { btnPrimary, btnSecondary, cardCls, checkboxCls, Field, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Msg = { kind: 'success' | 'error' | 'info'; text: string } | null
type R<T = object> = ({ success: true } & T) | { success: false; error: string }

export interface GalleryActions {
  load: (parishId: string) => Promise<GalleryOverview>
  saveAlbum: (parishId: string, albumId: string | null, input: AlbumInput) => Promise<R<{ id: string }>>
  upload: (parishId: string, albumId: string, formData: FormData) => Promise<R<{ photo: GalleryPhoto }>>
  updatePhotos: (parishId: string, albumId: string, input: { order?: string[]; captions?: Record<string, string>; coverId?: string | null }) => Promise<R>
  deletePhoto: (parishId: string, photoId: string) => Promise<R>
  deleteAlbum: (parishId: string, albumId: string) => Promise<R>
  /** len diecéza */
  setQuota?: (parishId: string, megabytes: number) => Promise<R>
  takedown?: (parishId: string, albumId: string, reason: string | null) => Promise<R>
}

const fmtBytes = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} kB` : n < 1024 ** 3 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${(n / 1024 ** 3).toFixed(2).replace('.', ',')} GB`)
const fmtDate = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

/** Vercel prijme najviac 4,5 MB na požiadavku – fotku preto pred odoslaním zmenšíme už v prehliadači (server ju aj tak prevedie do WebP). */
const CLIENT_MAX_SIDE = 2400
const CLIENT_MAX_BYTES = 4 * 1024 * 1024

async function shrinkForUpload(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, CLIENT_MAX_SIDE / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size <= CLIENT_MAX_BYTES && file.type !== 'image/heic') {
      bmp.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // prehliadač formát nevie dekódovať (napr. HEIC v Chrome) – skúsime poslať originál
  }
}

export default function ParishGalleryTab({ parishId, parishSlug, actions, isDiocese = false }: { parishId: string; parishSlug: string | null; actions: GalleryActions; isDiocese?: boolean }) {
  const [data, setData] = useState<GalleryOverview | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const reload = useCallback(async () => setData(await actions.load(parishId)), [actions, parishId])
  useEffect(() => {
    actions.load(parishId).then(setData, () => setMsg({ kind: 'error', text: 'Galériu sa nepodarilo načítať.' }))
  }, [actions, parishId])

  if (!data) {
    if (msg) return <Notice kind={msg.kind}>{msg.text}</Notice>
    return (
      <div className={`${cardCls} flex items-center gap-2 text-sm text-gray-500`}>
        <Loader2 size={16} className="animate-spin" /> Načítavam galériu…
      </div>
    )
  }

  const open = data.albums.find((a) => a.id === openId)
  if (open) {
    return <AlbumEditor parishId={parishId} parishSlug={parishSlug} album={open} overview={data} actions={actions} isDiocese={isDiocese} onBack={() => setOpenId(null)} reload={reload} />
  }
  if (creating) {
    return (
      <div className={cardCls}>
        <AlbumForm
          initial={{ title: '', description: '', event_date: new Date().toISOString().slice(0, 10), external_url: '', published: true }}
          isChurch={false}
          onCancel={() => setCreating(false)}
          onSave={async (input) => {
            const res = await actions.saveAlbum(parishId, null, input)
            if (!res.success) return res.error
            await reload()
            setCreating(false)
            if (!input.external_url) setOpenId(res.id)
            return null
          }}
        />
      </div>
    )
  }

  const church = data.albums.find((a) => a.kind === 'church')
  const life = data.albums.filter((a) => a.kind === 'life')

  return (
    <div className="space-y-6">
      <div className={`${cardCls} space-y-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle title="Fotogaléria" description="Fotky kostola sa zobrazia hore na stránke farnosti, albumy „Zo života farnosti“ v samostatnej sekcii a na podstránke Galéria." />
          <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
            <Plus size={16} /> Nový album
          </button>
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <QuotaBar parishId={parishId} overview={data} actions={actions} isDiocese={isDiocese} reload={reload} />
        <GdprNotice />
      </div>

      {church && (
        <button type="button" onClick={() => setOpenId(church.id)} className={`${cardCls} w-full text-left flex items-center gap-4 hover:border-blue-200 cursor-pointer`}>
          <Thumbs album={church} />
          <div className="flex-1">
            <p className="font-black text-gray-900">Kostol a farnosť</p>
            <p className="text-sm text-gray-500">
              {church.photos.length ? `${church.photos.length} fotiek – pás fotiek hore na stránke farnosti` : 'Zatiaľ bez fotiek – na stránke sa zobrazí len titulný obrázok.'}
            </p>
          </div>
          <Pencil size={16} className="text-gray-400" />
        </button>
      )}

      <div className={`${cardCls} space-y-3`}>
        <p className="font-black text-gray-900">Zo života farnosti</p>
        {life.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Zatiaľ žiadne albumy. Začnite tlačidlom „Nový album“.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {life.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setOpenId(a.id)} className="w-full py-3 flex items-center gap-4 text-left cursor-pointer hover:bg-gray-50 rounded-xl px-2">
                  <Thumbs album={a} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <AlbumStatus album={a} />
                      {a.event_date && ` · ${fmtDate(a.event_date)}`}
                      {a.external_url ? ' · externý album' : ` · ${a.photos.length} fotiek`}
                    </p>
                  </div>
                  <Pencil size={16} className="text-gray-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function AlbumStatus({ album }: { album: GalleryAlbum }) {
  if (album.taken_down_at) return <span className="text-red-600 font-bold">Stiahnuté biskupským úradom{album.takedown_reason ? ` – ${album.takedown_reason}` : ''}</span>
  if (album.published) return <span className="text-emerald-600 font-bold">Zverejnené</span>
  return <span className="font-bold">Skryté</span>
}

function Thumbs({ album }: { album: GalleryAlbum }) {
  const cover = album.photos.find((p) => p.id === album.cover_photo_id) ?? album.photos[0]
  return (
    <div className="w-20 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.url} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : album.external_url ? (
        <Link2 size={20} className="text-gray-400" />
      ) : (
        <Images size={20} className="text-gray-300" />
      )}
    </div>
  )
}

function QuotaBar({ parishId, overview, actions, isDiocese, reload }: { parishId: string; overview: GalleryOverview; actions: GalleryActions; isDiocese: boolean; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [mb, setMb] = useState(String(Math.round(overview.quotaBytes / 1024 / 1024)))
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const pct = Math.min(100, Math.round((100 * overview.usedBytes) / Math.max(1, overview.quotaBytes)))
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-gray-600">
          Využité úložisko: <b>{fmtBytes(overview.usedBytes)}</b> z {fmtBytes(overview.quotaBytes)}
        </span>
        {isDiocese && actions.setQuota && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
            Zmeniť kvótu
          </button>
        )}
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
      {!isDiocese && pct >= 90 && <p className="text-xs text-red-600">Úložisko je takmer plné. Zmažte staršie fotky alebo požiadajte biskupský úrad o navýšenie.</p>}
      {editing && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <input type="number" min={10} step={100} value={mb} onChange={(e) => setMb(e.target.value)} className={`${inputCls} !w-36`} />
          <span className="text-sm text-gray-500">MB</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await actions.setQuota!(parishId, Number(mb))
                if (!res.success) return setErr(res.error)
                setErr(null)
                setEditing(false)
                await reload()
              })
            }
            className={btnPrimary}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Uložiť
          </button>
          <button type="button" onClick={() => setEditing(false)} className={btnSecondary}>
            Zrušiť
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      )}
    </div>
  )
}

function GdprNotice() {
  return (
    <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
      <ShieldCheck size={18} className="shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-bold">Pred zverejnením fotiek s ľuďmi</p>
        <p>
          Zverejňujte len fotky, na ktoré má farnosť právo a pri ktorých osoby nemajú námietky. Pri deťoch a mladistvých je potrebný súhlas rodičov. Prednostne
          vyberajte celkové zábery z podujatí pred detailmi tvárí. Ak niekto požiada o odstránenie fotky, zmažte ju bez zbytočného odkladu.
        </p>
      </div>
    </div>
  )
}

function AlbumForm({
  initial,
  isChurch,
  onSave,
  onCancel,
}: {
  initial: AlbumInput
  isChurch: boolean
  onSave: (input: AlbumInput) => Promise<string | null>
  onCancel: () => void
}) {
  const [form, setForm] = useState<AlbumInput>(initial)
  const [external, setExternal] = useState(!!initial.external_url)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const set = <K extends keyof AlbumInput>(k: K, v: AlbumInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => setErr(await onSave({ ...form, external_url: external ? form.external_url : null })))
      }}
    >
      {!isChurch && (
        <div className="grid md:grid-cols-[1fr_200px] gap-4">
          <Field label="Názov albumu">
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="napr. Prvé sväté prijímanie 2026" />
          </Field>
          <Field label="Dátum udalosti">
            <input type="date" value={form.event_date ?? ''} onChange={(e) => set('event_date', e.target.value || null)} className={inputCls} />
          </Field>
        </div>
      )}
      <Field label={isChurch ? 'Krátky popis (nepovinné)' : 'Popis (nepovinné)'}>
        <textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className={inputCls} />
      </Field>
      {!isChurch && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} className={checkboxCls} />
            Fotky sú v inom albume (Facebook, Google Fotky, Zonerama…) – zobraziť len odkaz
          </label>
          {external && (
            <Field label="Odkaz na album" hint="Musí začínať https://. Na stránke sa zobrazí dlaždica, ktorá otvorí album v novom okne.">
              <input type="url" required value={form.external_url ?? ''} onChange={(e) => set('external_url', e.target.value)} className={inputCls} placeholder="https://" />
            </Field>
          )}
        </div>
      )}
      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.published !== false} onChange={(e) => set('published', e.target.checked)} className={checkboxCls} />
        Zverejnené na stránke farnosti
      </label>
      {err && <Notice kind="error">{err}</Notice>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Uložiť
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Zrušiť
        </button>
      </div>
    </form>
  )
}

type UploadItem = { name: string; state: 'waiting' | 'uploading' | 'done' | 'error'; error?: string }

function AlbumEditor({
  parishId,
  parishSlug,
  album,
  overview,
  actions,
  isDiocese,
  onBack,
  reload,
}: {
  parishId: string
  parishSlug: string | null
  album: GalleryAlbum
  overview: GalleryOverview
  actions: GalleryActions
  isDiocese: boolean
  onBack: () => void
  reload: () => Promise<void>
}) {
  const isChurch = album.kind === 'church'
  const [editingMeta, setEditingMeta] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [queue, setQueue] = useState<UploadItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const uploading = queue.some((q) => q.state === 'waiting' || q.state === 'uploading')
  const dirtyCaptions = Object.keys(captions).length > 0

  const uploadFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!images.length) return
    setMsg(null)
    setQueue(images.map((f) => ({ name: f.name, state: 'waiting' })))
    let failed = 0
    // po jednej – server fotku spracuje (sharp) a stráži kvótu
    for (let i = 0; i < images.length; i++) {
      setQueue((q) => q.map((x, j) => (j === i ? { ...x, state: 'uploading' } : x)))
      const fd = new FormData()
      fd.append('file', await shrinkForUpload(images[i]))
      let res: R<{ photo: GalleryPhoto }>
      try {
        res = await actions.upload(parishId, album.id, fd)
      } catch {
        res = { success: false, error: 'Fotku sa nepodarilo odoslať (príliš veľký súbor alebo výpadok spojenia).' }
      }
      if (!res.success) failed++
      setQueue((q) => q.map((x, j) => (j === i ? { ...x, state: res.success ? 'done' : 'error', error: res.success ? undefined : res.error } : x)))
      if (!res.success && /kvót|úložisk/i.test(res.error)) break
    }
    await reload()
    if (!failed) setQueue([])
    setMsg(failed ? { kind: 'error', text: `Niektoré fotky (${failed}) sa nenahrali – pozrite zoznam nižšie.` } : { kind: 'success', text: `Nahraté: ${images.length}.` })
  }

  const run = (fn: () => Promise<R>, ok: string) =>
    startTransition(async () => {
      const res = await fn()
      setMsg(res.success ? { kind: 'success', text: ok } : { kind: 'error', text: res.error })
      if (res.success) await reload()
    })

  const move = (idx: number, dir: -1 | 1) => {
    const order = album.photos.map((p) => p.id)
    const j = idx + dir
    if (j < 0 || j >= order.length) return
    ;[order[idx], order[j]] = [order[j], order[idx]]
    run(() => actions.updatePhotos(parishId, album.id, { order }), 'Poradie uložené.')
  }

  const publicUrl = parishSlug && !isChurch && album.published && !album.taken_down_at && !album.external_url ? `/farnosti/${parishSlug}/galeria/${album.slug}` : null

  return (
    <div className="space-y-6">
      <div className={`${cardCls} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600 cursor-pointer mb-2">
              <ArrowLeft size={15} /> Všetky albumy
            </button>
            <h2 className="text-xl font-black text-gray-900">{isChurch ? 'Kostol a farnosť' : album.title}</h2>
            <p className="text-xs text-gray-400 mt-1">
              <AlbumStatus album={album} />
              {album.event_date && !isChurch && ` · ${fmtDate(album.event_date)}`}
              {!album.external_url && ` · ${album.photos.length} fotiek · ${fmtBytes(album.photos.reduce((a, p) => a + Number(p.size_bytes), 0))}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                <ExternalLink size={14} /> Zobraziť
              </a>
            )}
            {album.external_url && (
              <a href={album.external_url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                <ExternalLink size={14} /> Externý album
              </a>
            )}
            {!editingMeta && (
              <button type="button" onClick={() => setEditingMeta(true)} className={btnSecondary}>
                <Pencil size={14} /> Upraviť údaje
              </button>
            )}
            {!isChurch && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Naozaj zmazať album „${album.title}“ aj so všetkými fotkami (${album.photos.length})?`)) return
                  startTransition(async () => {
                    const res = await actions.deleteAlbum(parishId, album.id)
                    if (!res.success) return setMsg({ kind: 'error', text: res.error })
                    await reload()
                    onBack()
                  })
                }}
                className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}
              >
                <Trash2 size={14} /> Zmazať album
              </button>
            )}
          </div>
        </div>

        {album.taken_down_at && !isDiocese && (
          <Notice kind="error">Album stiahol biskupský úrad{album.takedown_reason ? `: ${album.takedown_reason}` : ''}. Na stránke farnosti sa nezobrazuje.</Notice>
        )}
        {isDiocese && actions.takedown && !isChurch && <TakedownBox album={album} onRun={(reason) => run(() => actions.takedown!(parishId, album.id, reason), reason ? 'Album stiahnutý.' : 'Album znova zverejnený.')} pending={pending} />}

        {editingMeta && (
          <div className="border-t border-gray-100 pt-4">
            <AlbumForm
              initial={{ title: album.title, description: album.description ?? '', event_date: album.event_date, external_url: album.external_url ?? '', published: album.published }}
              isChurch={isChurch}
              onCancel={() => setEditingMeta(false)}
              onSave={async (input) => {
                const res = await actions.saveAlbum(parishId, album.id, input)
                if (!res.success) return res.error
                await reload()
                setEditingMeta(false)
                setMsg({ kind: 'success', text: 'Uložené.' })
                return null
              }}
            />
          </div>
        )}
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </div>

      {!album.external_url && (
        <>
          <div
            className={`${cardCls} border-2 border-dashed ${dragOver ? '!border-blue-400 !bg-blue-50' : '!border-gray-200'} text-center space-y-3`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (!uploading) void uploadFiles(Array.from(e.dataTransfer.files))
            }}
          >
            <Upload size={28} className="mx-auto text-gray-300" />
            <p className="text-sm text-gray-600">
              Pretiahnite sem fotky alebo{' '}
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="font-bold text-blue-600 hover:underline cursor-pointer">
                vyberte z počítača / telefónu
              </button>
            </p>
            <p className="text-xs text-gray-400">
              Môžete vybrať viac fotiek naraz. Automaticky sa zmenšia a uložia v úspornom formáte. Voľné miesto: {fmtBytes(Math.max(0, overview.quotaBytes - overview.usedBytes))}.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                e.target.value = ''
                void uploadFiles(files)
              }}
            />
            {queue.length > 0 && (
              <ul className="text-left text-sm max-w-xl mx-auto space-y-1 pt-2">
                {queue.map((q, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {q.state === 'uploading' ? (
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                    ) : q.state === 'done' ? (
                      <span className="text-emerald-600">✓</span>
                    ) : q.state === 'error' ? (
                      <X size={14} className="text-red-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                    )}
                    <span className="truncate text-gray-700">{q.name}</span>
                    {q.error && <span className="text-red-600 text-xs">– {q.error}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {album.photos.length > 0 && (
            <div className={`${cardCls} space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-500">
                  {isChurch ? 'Prvá fotka je hlavná – zobrazí sa najväčšia.' : 'Hviezdička označuje titulnú fotku albumu.'} Poradie zmeníte šípkami.
                </p>
                {dirtyCaptions && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const res = await actions.updatePhotos(parishId, album.id, { captions })
                        if (res.success) setCaptions({})
                        return res
                      }, 'Popisy uložené.')
                    }
                    className={btnPrimary}
                  >
                    <Save size={14} /> Uložiť popisy
                  </button>
                )}
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {album.photos.map((p, idx) => {
                  const isCover = album.cover_photo_id === p.id
                  return (
                    <li key={p.id} className={`rounded-2xl border ${isCover ? 'border-amber-300 ring-2 ring-amber-200' : 'border-gray-100'} overflow-hidden bg-white`}>
                      <div className="aspect-[4/3] bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="p-2 space-y-2">
                        <input
                          value={captions[p.id] ?? p.caption ?? ''}
                          onChange={(e) => setCaptions((c) => ({ ...c, [p.id]: e.target.value }))}
                          placeholder="Popis (nepovinné)"
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-400 outline-none"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex">
                            <button type="button" title="Posunúť dopredu" disabled={pending || idx === 0} onClick={() => move(idx, -1)} className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer">
                              <ArrowLeft size={14} />
                            </button>
                            <button
                              type="button"
                              title="Posunúť dozadu"
                              disabled={pending || idx === album.photos.length - 1}
                              onClick={() => move(idx, 1)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                          <div className="flex">
                            {!isChurch && (
                              <button
                                type="button"
                                title="Titulná fotka albumu"
                                disabled={pending || isCover}
                                onClick={() => run(() => actions.updatePhotos(parishId, album.id, { coverId: p.id }), 'Titulná fotka nastavená.')}
                                className={`p-1.5 cursor-pointer ${isCover ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                              >
                                <Star size={14} fill={isCover ? 'currentColor' : 'none'} />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Zmazať fotku"
                              disabled={pending}
                              onClick={() => {
                                if (confirm('Zmazať túto fotku?')) run(() => actions.deletePhoto(parishId, p.id), 'Fotka zmazaná.')
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TakedownBox({ album, onRun, pending }: { album: GalleryAlbum; onRun: (reason: string | null) => void; pending: boolean }) {
  const [reason, setReason] = useState('')
  if (album.taken_down_at) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
        <EyeOff size={16} /> Album je stiahnutý{album.takedown_reason ? `: ${album.takedown_reason}` : ''}.
        <button type="button" disabled={pending} onClick={() => onRun(null)} className={btnSecondary}>
          <Eye size={14} /> Znova zverejniť
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-gray-50 border border-gray-200 p-3">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Dôvod stiahnutia (uvidí ho farnosť)" className={`${inputCls} !w-auto flex-1 min-w-[220px]`} />
      <button
        type="button"
        disabled={pending || !reason.trim()}
        onClick={() => {
          if (confirm('Stiahnuť album zo stránky farnosti?')) onRun(reason.trim())
        }}
        className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}
      >
        <Ban size={14} /> Stiahnuť album
      </button>
    </div>
  )
}
