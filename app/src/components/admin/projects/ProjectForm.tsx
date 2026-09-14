'use client'

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Loader2, AlertTriangle, CheckCircle2, ExternalLink,
  Image as ImageIcon, Trash2, Link as LinkIcon, Info, Users, Coins, TrendingUp, CalendarClock,
} from 'lucide-react'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import { saveProject, uploadProjectFile } from '@/app/admin/projekty/actions'
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  formatDate,
  formatEur,
  type ParishOption,
  type ProjectAdminDetail,
  type ProjectCategory,
  type ProjectDonationsData,
  type ProjectPayload,
  type ProjectStatus,
} from '@/lib/projects/types'
import { generateSlug } from '@/lib/slug'
import { Field, Notice, SectionTitle, btnPrimary, btnSecondary, cardCls, checkboxCls, inputCls } from './ui'
import ProjectBudgetTab from './ProjectBudgetTab'
import ProjectMediaTab from './ProjectMediaTab'
import ProjectMilestonesTab from './ProjectMilestonesTab'
import ProjectPostsTab from './ProjectPostsTab'
import ProjectDonationsTab from './ProjectDonationsTab'

type TabKey = 'basic' | 'content' | 'finance' | 'budget' | 'media' | 'milestones' | 'posts' | 'donations'

const TABS: { key: TabKey; label: string; needsId?: boolean }[] = [
  { key: 'basic', label: 'Základné' },
  { key: 'content', label: 'Obsah' },
  { key: 'finance', label: 'Financie' },
  { key: 'budget', label: 'Rozpočet', needsId: true },
  { key: 'media', label: 'Galéria a dokumenty', needsId: true },
  { key: 'milestones', label: 'Harmonogram', needsId: true },
  { key: 'posts', label: 'Správy', needsId: true },
  { key: 'donations', label: 'Dary', needsId: true },
]

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

interface FormState {
  name: string
  slug: string
  subtitle: string
  description: string
  content: string
  closing_summary: string
  category: ProjectCategory
  status: ProjectStatus
  visible_on_web: boolean
  featured: boolean
  sort_order: string
  video_url: string
  recipient_name: string
  recipient_address: string
  guarantor_name: string
  guarantor_role: string
  parish_id: string
  location: string
  start_date: string
  end_date: string
  target_amount: string
  specific_symbol: string
  legacy_variable_symbol: string
  legacy_collected_amount: string
  legacy_supporters_count: string
  allow_one_time: boolean
  allow_recurring: boolean
  suggested_amounts: string
}

function toState(detail?: ProjectAdminDetail): FormState {
  const p = detail?.project
  return {
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    subtitle: p?.subtitle ?? '',
    description: p?.description ?? '',
    content: p?.content ?? '',
    closing_summary: p?.closing_summary ?? '',
    category: p?.category ?? 'other',
    status: p?.status ?? 'draft',
    visible_on_web: p?.visible_on_web ?? false,
    featured: p?.featured ?? false,
    sort_order: String(p?.sort_order ?? 0),
    video_url: p?.video_url ?? '',
    recipient_name: p?.recipient_name ?? '',
    recipient_address: p?.recipient_address ?? '',
    guarantor_name: p?.guarantor_name ?? '',
    guarantor_role: p?.guarantor_role ?? '',
    parish_id: p?.parish_id ?? '',
    location: p?.location ?? '',
    start_date: p?.start_date ?? '',
    end_date: p?.end_date ?? '',
    target_amount: p?.target_amount != null ? String(p.target_amount) : '',
    specific_symbol: p?.specific_symbol ?? '',
    legacy_variable_symbol: p?.legacy_variable_symbol ?? '',
    legacy_collected_amount: String(p?.legacy_collected_amount ?? 0),
    legacy_supporters_count: String(p?.legacy_supporters_count ?? 0),
    allow_one_time: p?.allow_one_time ?? true,
    allow_recurring: p?.allow_recurring ?? true,
    suggested_amounts: (p?.suggested_amounts?.length ? p.suggested_amounts : [10, 20, 50, 100]).join(', '),
  }
}

interface ProjectFormProps {
  initial?: ProjectAdminDetail
  parishes: ParishOption[]
  donations?: ProjectDonationsData
}

export default function ProjectForm({ initial, parishes, donations }: ProjectFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<TabKey>('basic')
  const [form, setForm] = useState<FormState>(() => toState(initial))
  const [isCustomSlug, setIsCustomSlug] = useState(!!initial)
  const [imageUrl, setImageUrl] = useState(initial?.project.image_url ?? '')
  const [guarantorPhotoUrl, setGuarantorPhotoUrl] = useState(initial?.project.guarantor_photo_url ?? '')
  const [uploading, setUploading] = useState<'hero' | 'guarantor' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const projectId = initial?.project.id
  const stats = initial?.stats

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value, slug: isCustomSlug ? prev.slug : generateSlug(value) }))
  }

  const handleUpload = async (
    kind: 'hero' | 'guarantor',
    e: ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Obrázok je príliš veľký (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximálna veľkosť je 4 MB.`)
      e.target.value = ''
      return
    }
    setUploading(kind)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)
    if (projectId) fd.append('projectId', projectId)
    try {
      const res = await uploadProjectFile(fd)
      if ('error' in res) setError(res.error)
      else setter(res.url)
    } catch {
      setError('Nahrávanie obrázka zlyhalo.')
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const contentUploader = async (fd: FormData) => {
    fd.append('kind', 'content')
    if (projectId) fd.append('projectId', projectId)
    const res = await uploadProjectFile(fd)
    return 'error' in res ? { error: res.error } : { url: res.url }
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Názov výzvy je povinný.')
      setTab('basic')
      return
    }
    setError(null)
    setSuccess(null)

    const payload: ProjectPayload = {
      id: projectId,
      name: form.name,
      slug: form.slug,
      subtitle: form.subtitle,
      description: form.description,
      content: form.content,
      closing_summary: form.closing_summary,
      category: form.category,
      status: form.status,
      visible_on_web: form.visible_on_web,
      featured: form.featured,
      sort_order: parseInt(form.sort_order, 10) || 0,
      image_url: imageUrl || null,
      video_url: form.video_url,
      recipient_name: form.recipient_name,
      recipient_address: form.recipient_address,
      guarantor_name: form.guarantor_name,
      guarantor_role: form.guarantor_role,
      guarantor_photo_url: guarantorPhotoUrl || null,
      parish_id: form.parish_id || null,
      location: form.location,
      target_amount: form.target_amount ? parseFloat(form.target_amount.replace(',', '.')) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      specific_symbol: form.specific_symbol,
      legacy_variable_symbol: form.legacy_variable_symbol,
      legacy_collected_amount: parseFloat(form.legacy_collected_amount.replace(',', '.')) || 0,
      legacy_supporters_count: parseInt(form.legacy_supporters_count, 10) || 0,
      allow_one_time: form.allow_one_time,
      allow_recurring: form.allow_recurring,
      suggested_amounts: form.suggested_amounts
        .split(/[,;\s]+/)
        .map((x) => parseInt(x, 10))
        .filter((x) => Number.isFinite(x) && x > 0),
    }

    startTransition(async () => {
      const res = await saveProject(payload)
      if (!res.success) {
        setError(res.error)
        return
      }
      if (!projectId) {
        router.push(`/admin/projekty/${res.id}`)
        return
      }
      setForm((prev) => ({ ...prev, slug: res.slug }))
      setSuccess('Výzva bola uložená.')
      router.refresh()
    })
  }

  const ImageUploadField = ({
    label,
    hint,
    url,
    kind,
    onChange,
    aspect = 'aspect-video',
  }: {
    label: string
    hint?: string
    url: string
    kind: 'hero' | 'guarantor'
    onChange: (url: string) => void
    aspect?: string
  }) => (
    <Field label={label} hint={hint}>
      <div className="space-y-3">
        <div className={`${aspect} w-full max-w-md rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center relative`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-300" />
          )}
          {uploading === kind && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className={btnSecondary}>
            <ImageIcon size={14} /> {url ? 'Zmeniť obrázok' : 'Nahrať obrázok'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading !== null} onChange={(e) => handleUpload(kind, e, onChange)} />
          </label>
          {url && (
            <button type="button" onClick={() => onChange('')} className={`${btnSecondary} text-red-600 hover:bg-red-50 hover:border-red-200`}>
              <Trash2 size={14} /> Odstrániť
            </button>
          )}
        </div>
      </div>
    </Field>
  )

  return (
    <form onSubmit={handleSave} className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Hlavička */}
      <div className={`${cardCls} flex flex-col lg:flex-row lg:items-center gap-4 justify-between`}>
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/admin/projekty" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 shrink-0" title="Späť na zoznam">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-gray-900 truncate">{initial ? form.name || 'Výzva' : 'Nová výzva na podporu'}</h1>
            <p className="text-xs text-gray-400 font-bold mt-0.5 flex items-center gap-2 flex-wrap">
              {initial ? (
                <>
                  <span>/vyzvy/{form.slug}</span>
                  {form.visible_on_web && (
                    <Link href={`/vyzvy/${form.slug}`} target="_blank" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                      <ExternalLink size={11} /> otvoriť na webe
                    </Link>
                  )}
                </>
              ) : (
                'Vyplňte základné údaje a uložte. Rozpočet, galéria a ostatné záložky sa odomknú po prvom uložení.'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 font-bold pr-3 border-r border-gray-100">
              <span className="flex items-center gap-1"><Coins size={13} className="text-blue-500" /> {formatEur(stats.collected_amount)}</span>
              <span className="flex items-center gap-1"><Users size={13} className="text-blue-500" /> {stats.supporters_count}</span>
            </div>
          )}
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {initial ? 'Uložiť zmeny' : 'Vytvoriť výzvu'}
          </button>
        </div>
      </div>

      {error && (
        <Notice kind="error">
          <span className="flex items-start gap-2"><AlertTriangle size={18} className="shrink-0 mt-0.5" /> {error}</span>
        </Notice>
      )}
      {success && (
        <Notice kind="success">
          <span className="flex items-start gap-2"><CheckCircle2 size={18} className="shrink-0 mt-0.5" /> {success}</span>
        </Notice>
      )}

      {/* Záložky */}
      <div className="flex gap-1 overflow-x-auto bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
        {TABS.map((t) => {
          const disabled = !!t.needsId && !projectId
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled}
              onClick={() => setTab(t.key)}
              title={disabled ? 'Dostupné po prvom uložení' : undefined}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ZÁKLADNÉ */}
      {tab === 'basic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={`${cardCls} space-y-5`}>
              <SectionTitle title="Názov a popis" />
              <Field label="Názov výzvy *">
                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="napr. Rekonštrukcia ZŠ sv. Cyrila a Metoda"
                  className={`${inputCls} text-lg font-extrabold`}
                  required
                />
              </Field>
              <Field label="Podnadpis / perex" hint="1 až 2 vety. Zobrazí sa na karte výzvy a pri zdieľaní na sociálnych sieťach.">
                <textarea value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Kategória">
                  <select value={form.category} onChange={(e) => set('category', e.target.value as ProjectCategory)} className={inputCls}>
                    {PROJECT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Miesto realizácie" hint="napr. názov školy a mesto">
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Farnosť" hint="Voliteľné. Prepojenie na farnosť, ktorej sa výzva týka.">
                <select value={form.parish_id} onChange={(e) => set('parish_id', e.target.value)} className={inputCls}>
                  <option value="">– bez farnosti –</option>
                  {parishes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.city && p.city !== p.name ? ` (${p.city})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Interná poznámka" hint="Nezobrazuje sa na webe.">
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </Field>
            </div>

            <div className={`${cardCls} space-y-5`}>
              <SectionTitle title="Príjemca a garant" description="Zobrazujú sa na stránke výzvy, tak ako na pôvodnom webe." />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Príjemca daru">
                  <input value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} placeholder="napr. Diecézna charita Žilina" className={inputCls} />
                </Field>
                <Field label="Adresa príjemcu">
                  <input value={form.recipient_address} onChange={(e) => set('recipient_address', e.target.value)} placeholder="Ulica 1, 010 01 Žilina" className={inputCls} />
                </Field>
                <Field label="Garant projektu">
                  <input value={form.guarantor_name} onChange={(e) => set('guarantor_name', e.target.value)} placeholder="Mgr. Meno Priezvisko" className={inputCls} />
                </Field>
                <Field label="Funkcia garanta">
                  <input value={form.guarantor_role} onChange={(e) => set('guarantor_role', e.target.value)} placeholder="napr. riaditeľ fondu" className={inputCls} />
                </Field>
              </div>
              <ImageUploadField label="Fotografia garanta" url={guarantorPhotoUrl} kind="guarantor" onChange={setGuarantorPhotoUrl} aspect="aspect-square max-w-[160px]" />
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${cardCls} space-y-5`}>
              <SectionTitle title="Zverejnenie" />
              <Field label="Stav">
                <select value={form.status} onChange={(e) => set('status', e.target.value as ProjectStatus)} className={inputCls}>
                  {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 transition-all">
                <input type="checkbox" checked={form.visible_on_web} onChange={(e) => set('visible_on_web', e.target.checked)} className={`${checkboxCls} mt-0.5`} />
                <span>
                  <span className="text-sm font-bold text-gray-900 block">Zobraziť na webe</span>
                  <span className="text-[10px] text-gray-400">Výzva bude v zozname /vyzvy a bude sa dať podporiť.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 transition-all">
                <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className={`${checkboxCls} mt-0.5`} />
                <span>
                  <span className="text-sm font-bold text-gray-900 block">Zvýrazniť na domovskej stránke</span>
                  <span className="text-[10px] text-gray-400">Karta výzvy sa zobrazí na úvodnej stránke.</span>
                </span>
              </label>
              <Field label="Poradie" hint="Nižšie číslo = vyššie v zozname.">
                <input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} className={inputCls} />
              </Field>
              <Field label="URL adresa (slug)">
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    onFocus={() => setIsCustomSlug(true)}
                    className={`${inputCls} pl-9 text-xs font-mono`}
                    placeholder="automaticky-z-nazvu"
                  />
                </div>
                {initial && form.slug !== initial.project.slug && (
                  <p className="text-[11px] text-amber-700 mt-1.5 px-1 flex items-start gap-1">
                    <Info size={12} className="shrink-0 mt-0.5" /> Zmena adresy rozbije už zdieľané odkazy na túto výzvu.
                  </p>
                )}
              </Field>
            </div>

            <div className={`${cardCls} space-y-5`}>
              <SectionTitle title="Termín a cieľ" />
              <Field label="Cieľová suma (€)" hint="Prázdne = bez cieľovej sumy (bez progress baru).">
                <input type="number" min="0" step="0.01" value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Začiatok">
                <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Darovať možno do" hint="Prázdne = priebežne. Po tomto dátume sa darovací formulár skryje.">
                <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} />
              </Field>
            </div>

            <div className={cardCls}>
              <ImageUploadField label="Hlavný obrázok" hint="Pomer 16:9, do 4 MB. Zobrazuje sa v hlavičke výzvy a na karte." url={imageUrl} kind="hero" onChange={setImageUrl} />
            </div>
          </div>
        </div>
      )}

      {/* OBSAH */}
      {tab === 'content' && (
        <div className="space-y-6">
          <div className={`${cardCls} space-y-5`}>
            <SectionTitle title="Popis výzvy" description="Dlhý text, ktorý sa zobrazí na stránke výzvy. Obrázky sa nahrávajú na B2, video cez tlačidlo YouTube." />
            <SimpleRichTextEditor label="Obsah" value={form.content} onChange={(v) => set('content', v)} minHeight="360px" uploader={contentUploader} />
          </div>
          <div className={`${cardCls} space-y-5`}>
            <SectionTitle title="Hero video" description="Ak je vyplnené, v hlavičke výzvy sa namiesto obrázka zobrazí video." />
            <Field label="YouTube alebo Vimeo URL">
              <input value={form.video_url} onChange={(e) => set('video_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={inputCls} />
            </Field>
          </div>
          <div className={`${cardCls} space-y-5`}>
            <SectionTitle title="Záverečná správa" description="Zobrazí sa navrchu stránky, keď má výzva stav Ukončená. Čo sa podarilo, poďakovanie, fotky výsledku." />
            <SimpleRichTextEditor label="Záverečná správa" value={form.closing_summary} onChange={(v) => set('closing_summary', v)} minHeight="220px" uploader={contentUploader} />
          </div>
        </div>
      )}

      {/* FINANCIE */}
      {tab === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={`${cardCls} space-y-5`}>
              <SectionTitle title="Párovanie platieb" description="IBAN je spoločný pre všetky výzvy (účet fondu). Výzvu identifikuje špecifický symbol." />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Špecifický symbol" hint="Dary prevodom s týmto ŠS sa automaticky priradia k výzve.">
                  <input value={form.specific_symbol} onChange={(e) => set('specific_symbol', e.target.value)} className={`${inputCls} font-mono`} />
                </Field>
                <Field label="VS zo starého webu" hint="Bežiace trvalé príkazy zo starého webu (rad 1177xxxx).">
                  <input value={form.legacy_variable_symbol} onChange={(e) => set('legacy_variable_symbol', e.target.value)} className={`${inputCls} font-mono`} />
                </Field>
              </div>
            </div>

            <div className={`${cardCls} space-y-5`}>
              <SectionTitle title="Stav pred migráciou" description="Suma a počet darcov vyzbierané na starom webe. Pripočítavajú sa k živým darom z Kroku." />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Vyzbierané pred migráciou (€)">
                  <input type="number" min="0" step="0.01" value={form.legacy_collected_amount} onChange={(e) => set('legacy_collected_amount', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Počet darcov pred migráciou">
                  <input type="number" min="0" step="1" value={form.legacy_supporters_count} onChange={(e) => set('legacy_supporters_count', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>

            <div className={`${cardCls} space-y-5`}>
              <SectionTitle title="Darovanie cez Mollie" description="Nastavenie darovacieho formulára na stránke výzvy." />
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 transition-all">
                  <input type="checkbox" checked={form.allow_one_time} onChange={(e) => set('allow_one_time', e.target.checked)} className={checkboxCls} />
                  <span className="text-sm font-bold text-gray-900">Jednorazový dar</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 transition-all">
                  <input type="checkbox" checked={form.allow_recurring} onChange={(e) => set('allow_recurring', e.target.checked)} className={checkboxCls} />
                  <span className="text-sm font-bold text-gray-900">Pravidelný dar (mesačne / ročne)</span>
                </label>
              </div>
              <Field label="Navrhované sumy (€)" hint="Oddelené čiarkou. Zobrazia sa ako tlačidlá, darca môže zadať aj vlastnú sumu.">
                <input value={form.suggested_amounts} onChange={(e) => set('suggested_amounts', e.target.value)} placeholder="10, 20, 50, 100" className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${cardCls} space-y-4`}>
              <SectionTitle title="Živé štatistiky" description="Počítajú sa z darov priradených k výzve (banka aj Mollie) plus stav pred migráciou." />
              {stats ? (
                <div className="space-y-3">
                  <StatRow icon={<Coins size={16} />} label="Vyzbierané" value={formatEur(stats.collected_amount)} />
                  <StatRow icon={<TrendingUp size={16} />} label="Splnené" value={stats.percent != null ? `${stats.percent.toFixed(1)} %` : '–'} />
                  <StatRow icon={<Users size={16} />} label="Darcov" value={String(stats.supporters_count)} />
                  <StatRow icon={<Coins size={16} />} label="Darov v Kroku" value={String(stats.donations_count)} />
                  <StatRow icon={<CalendarClock size={16} />} label="Posledný dar" value={formatDate(stats.last_donation_at)} />
                </div>
              ) : (
                <p className="text-xs text-gray-400">Zobrazia sa po uložení výzvy.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OSTATNÉ ZÁLOŽKY – len s uloženou výzvou */}
      {projectId && initial && tab === 'budget' && (
        <ProjectBudgetTab projectId={projectId} initialItems={initial.budget} targetAmount={initial.project.target_amount} />
      )}
      {projectId && initial && tab === 'media' && <ProjectMediaTab projectId={projectId} initialMedia={initial.media} />}
      {projectId && initial && tab === 'milestones' && <ProjectMilestonesTab projectId={projectId} initialItems={initial.milestones} />}
      {projectId && initial && tab === 'posts' && <ProjectPostsTab projectId={projectId} posts={initial.posts} />}
      {projectId && initial && tab === 'donations' && (
        <ProjectDonationsTab stats={initial.stats} data={donations ?? { donations: [], payments: [], subscriptions: [] }} />
      )}
    </form>
  )
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className="flex items-center gap-2 text-xs font-bold text-gray-500">
        <span className="text-blue-500">{icon}</span> {label}
      </span>
      <span className="text-sm font-black text-gray-900">{value}</span>
    </div>
  )
}
