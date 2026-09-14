'use client'

import { useState, type ChangeEvent } from 'react'
import { ArrowUp, ArrowDown, Trash2, Eye, EyeOff, Loader2, Image as ImageIcon, FileText, Video, Plus, ExternalLink } from 'lucide-react'
import { addProjectMedia, deleteProjectMedia, reorderProjectMedia, updateProjectMedia, uploadProjectFile } from '@/app/admin/projekty/actions'
import { MEDIA_PHASES, type MediaKind, type MediaPhase, type ProjectMedia } from '@/lib/projects/types'
import { Notice, SectionTitle, btnIcon, btnIconDanger, btnSecondary, cardCls, inputCls } from './ui'

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

interface Props {
  projectId: string
  initialMedia: ProjectMedia[]
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ProjectMediaTab({ projectId, initialMedia }: Props) {
  const [items, setItems] = useState<ProjectMedia[]>(initialMedia)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null) // 'upload:image' | 'upload:document' | media id
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')

  const byKind = (kind: MediaKind) => items.filter((m) => m.kind === kind).sort((a, b) => a.sort_order - b.sort_order)

  const handleFiles = async (kind: 'image' | 'document', e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setError(null)
    setBusy(`upload:${kind}`)
    const errors: string[] = []
    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        errors.push(`${file.name}: príliš veľký (${(file.size / 1024 / 1024).toFixed(1)} MB, max 4 MB)`)
        continue
      }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind === 'image' ? 'gallery' : 'document')
      fd.append('projectId', projectId)
      const up = await uploadProjectFile(fd)
      if ('error' in up) {
        errors.push(`${file.name}: ${up.error}`)
        continue
      }
      const added = await addProjectMedia({
        project_id: projectId,
        kind,
        url: up.url,
        title: kind === 'document' ? file.name.replace(/\.[^.]+$/, '') : null,
        mime_type: up.type || null,
        file_size: up.size,
      })
      if (added.success) setItems((prev) => [...prev, added.media])
      else errors.push(`${file.name}: ${added.error}`)
    }
    if (errors.length) setError(errors.join(' · '))
    setBusy(null)
  }

  const handleAddVideo = async () => {
    const url = videoUrl.trim()
    if (!url) return
    setError(null)
    setBusy('upload:video')
    const added = await addProjectMedia({ project_id: projectId, kind: 'video', url, title: videoTitle.trim() || null })
    if (added.success) {
      setItems((prev) => [...prev, added.media])
      setVideoUrl('')
      setVideoTitle('')
    } else {
      setError(added.error)
    }
    setBusy(null)
  }

  const patchLocal = (id: string, patch: Partial<ProjectMedia>) => setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  const persist = async (id: string, patch: { title?: string | null; phase?: MediaPhase | null; visible?: boolean }) => {
    setBusy(id)
    const res = await updateProjectMedia(id, patch)
    if (!res.success) setError(res.error)
    setBusy(null)
  }

  const handleDelete = async (m: ProjectMedia) => {
    if (!confirm(`Naozaj odstrániť „${m.title || m.url.split('/').pop()}“?`)) return
    setBusy(m.id)
    const res = await deleteProjectMedia(m.id)
    if (res.success) setItems((prev) => prev.filter((x) => x.id !== m.id))
    else setError(res.error)
    setBusy(null)
  }

  const handleMove = async (kind: MediaKind, index: number, dir: -1 | 1) => {
    const list = byKind(kind)
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const reordered = [...list]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const withOrder = reordered.map((m, i) => ({ ...m, sort_order: i }))
    setItems((prev) => prev.map((m) => withOrder.find((w) => w.id === m.id) ?? m))
    const res = await reorderProjectMedia(projectId, withOrder.map((m) => m.id))
    if (!res.success) setError(res.error)
  }

  const images = byKind('image')
  const videos = byKind('video')
  const documents = byKind('document')

  return (
    <div className="space-y-6">
      {error && <Notice kind="error">{error}</Notice>}

      {/* FOTOGALÉRIA */}
      <div className={`${cardCls} space-y-5`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <SectionTitle title={`Fotogaléria (${images.length})`} description="Fotky sa zobrazujú v galérii na stránke výzvy. Pri rekonštrukciách označte fázu pred / počas / po." />
          <label className={btnSecondary}>
            {busy === 'upload:image' ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Nahrať fotky
            <input type="file" accept="image/*" multiple className="hidden" disabled={busy !== null} onChange={(e) => handleFiles('image', e)} />
          </label>
        </div>

        {images.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-6 text-center">Zatiaľ žiadne fotky. Môžete vybrať viac súborov naraz, každý do 4 MB.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((m, i) => (
              <div key={m.id} className={`rounded-2xl border overflow-hidden bg-gray-50 ${m.visible ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}>
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumbnail_url || m.url} alt={m.title ?? ''} className="w-full h-full object-cover" />
                  {busy === m.id && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
                  )}
                  {m.phase && (
                    <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider bg-white/90 text-gray-700 px-2 py-0.5 rounded-lg">
                      {MEDIA_PHASES.find((p) => p.value === m.phase)?.label}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <input
                    value={m.title ?? ''}
                    onChange={(e) => patchLocal(m.id, { title: e.target.value })}
                    onBlur={(e) => persist(m.id, { title: e.target.value })}
                    placeholder="Popisok fotky"
                    className={`${inputCls} bg-white text-xs py-2`}
                  />
                  <select
                    value={m.phase ?? ''}
                    onChange={(e) => {
                      const phase = (e.target.value || null) as MediaPhase | null
                      patchLocal(m.id, { phase })
                      persist(m.id, { phase })
                    }}
                    className={`${inputCls} bg-white text-xs py-2`}
                  >
                    <option value="">Bez fázy</option>
                    {MEDIA_PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      <button type="button" onClick={() => handleMove('image', i, -1)} disabled={i === 0} className={btnIcon} title="Posunúť dopredu"><ArrowUp size={14} /></button>
                      <button type="button" onClick={() => handleMove('image', i, 1)} disabled={i === images.length - 1} className={btnIcon} title="Posunúť dozadu"><ArrowDown size={14} /></button>
                      <button
                        type="button"
                        onClick={() => { patchLocal(m.id, { visible: !m.visible }); persist(m.id, { visible: !m.visible }) }}
                        className={btnIcon}
                        title={m.visible ? 'Skryť na webe' : 'Zobraziť na webe'}
                      >
                        {m.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                    <button type="button" onClick={() => handleDelete(m)} className={btnIconDanger} title="Odstrániť"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIDEÁ */}
      <div className={`${cardCls} space-y-5`}>
        <SectionTitle title={`Videá (${videos.length})`} description="Ďalšie videá k výzve (YouTube alebo Vimeo). Hlavné hero video sa nastavuje v záložke Obsah." />
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={`${inputCls} flex-1`} />
          <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Názov videa (voliteľné)" className={`${inputCls} sm:w-64`} />
          <button type="button" onClick={handleAddVideo} disabled={!videoUrl.trim() || busy !== null} className={btnSecondary}>
            {busy === 'upload:video' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Pridať
          </button>
        </div>
        {videos.length > 0 && (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
            {videos.map((m, i) => (
              <MediaRow
                key={m.id}
                media={m}
                icon={<Video size={16} />}
                index={i}
                count={videos.length}
                busy={busy === m.id}
                onTitle={(t) => patchLocal(m.id, { title: t })}
                onTitleBlur={(t) => persist(m.id, { title: t })}
                onMove={(dir) => handleMove('video', i, dir)}
                onToggle={() => { patchLocal(m.id, { visible: !m.visible }); persist(m.id, { visible: !m.visible }) }}
                onDelete={() => handleDelete(m)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* DOKUMENTY */}
      <div className={`${cardCls} space-y-5`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <SectionTitle title={`Dokumenty (${documents.length})`} description="PDF a iné súbory na stiahnutie: rozpočet, stavebné povolenie, výročná správa projektu." />
          <label className={btnSecondary}>
            {busy === 'upload:document' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Nahrať dokument
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" multiple className="hidden" disabled={busy !== null} onChange={(e) => handleFiles('document', e)} />
          </label>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">Zatiaľ žiadne dokumenty.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
            {documents.map((m, i) => (
              <MediaRow
                key={m.id}
                media={m}
                icon={<FileText size={16} />}
                index={i}
                count={documents.length}
                busy={busy === m.id}
                onTitle={(t) => patchLocal(m.id, { title: t })}
                onTitleBlur={(t) => persist(m.id, { title: t })}
                onMove={(dir) => handleMove('document', i, dir)}
                onToggle={() => { patchLocal(m.id, { visible: !m.visible }); persist(m.id, { visible: !m.visible }) }}
                onDelete={() => handleDelete(m)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MediaRow({
  media, icon, index, count, busy, onTitle, onTitleBlur, onMove, onToggle, onDelete,
}: {
  media: ProjectMedia
  icon: React.ReactNode
  index: number
  count: number
  busy: boolean
  onTitle: (t: string) => void
  onTitleBlur: (t: string) => void
  onMove: (dir: -1 | 1) => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <li className={`flex items-center gap-3 p-3 ${media.visible ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        <input
          value={media.title ?? ''}
          onChange={(e) => onTitle(e.target.value)}
          onBlur={(e) => onTitleBlur(e.target.value)}
          placeholder="Názov"
          className={`${inputCls} py-2 text-sm font-bold`}
        />
        <a href={media.url} target="_blank" rel="noreferrer" className="text-[11px] text-gray-400 hover:text-blue-600 inline-flex items-center gap-1 truncate max-w-full">
          <ExternalLink size={10} /> {media.url}
          {media.file_size ? <span className="ml-1 text-gray-300">· {formatSize(media.file_size)}</span> : null}
        </a>
      </div>
      <div className="flex gap-0.5 shrink-0">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className={btnIcon} title="Hore"><ArrowUp size={14} /></button>
        <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className={btnIcon} title="Dole"><ArrowDown size={14} /></button>
        <button type="button" onClick={onToggle} className={btnIcon} title={media.visible ? 'Skryť' : 'Zobraziť'}>{media.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
        <button type="button" onClick={onDelete} className={btnIconDanger} title="Odstrániť"><Trash2 size={14} /></button>
      </div>
    </li>
  )
}
