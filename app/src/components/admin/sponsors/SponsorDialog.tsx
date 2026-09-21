'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { X, Save, AlertCircle, Loader2, Image as ImageIcon, Trash2, Crop } from 'lucide-react'
import { uploadSponsorLogo } from '@/app/admin/sponzori/actions'
import type { Sponsor, SponsorPayload } from '@/lib/sponsors/types'
import LogoCropper from './LogoCropper'

interface Props {
  sponsor: Sponsor | null
  onSave: (payload: SponsorPayload) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

type Variant = 'light' | 'dark'
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

const inputCls =
  'w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all'
const labelCls = 'text-xs font-bold text-gray-400 uppercase tracking-wider px-1'

export default function SponsorDialog({ sponsor, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name: sponsor?.name ?? '',
    description: sponsor?.description ?? '',
    website_url: sponsor?.website_url ?? '',
    amount: sponsor?.amount != null ? String(sponsor.amount) : '',
    amount_public: sponsor?.amount_public ?? false,
    publish_from: sponsor?.publish_from ?? '',
    publish_until: sponsor?.publish_until ?? '',
    is_active: sponsor?.is_active ?? true,
    sort_order: String(sponsor?.sort_order ?? 0),
    internal_note: sponsor?.internal_note ?? '',
  })
  const [logoUrl, setLogoUrl] = useState(sponsor?.logo_url ?? '')
  const [logoDarkUrl, setLogoDarkUrl] = useState(sponsor?.logo_dark_url ?? '')
  const [uploading, setUploading] = useState<Variant | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Súbor čakajúci na orezanie
  const [pending, setPending] = useState<{ variant: Variant; file: File; src: string } | null>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setForm((prev) => ({ ...prev, [name]: val }))
  }

  const pickFile = (variant: Variant) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Logo je príliš veľké (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum je 4 MB.`)
      return
    }
    setError(null)
    setPending({ variant, file, src: URL.createObjectURL(file) })
  }

  const upload = async (variant: Variant, file: File) => {
    setUploading(variant)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('variant', variant)
      if (sponsor?.id) fd.append('sponsorId', sponsor.id)
      const res = await uploadSponsorLogo(fd)
      if ('error' in res) {
        setError(res.error)
        return
      }
      if (variant === 'light') setLogoUrl(res.url)
      else setLogoDarkUrl(res.url)
    } catch {
      setError('Nahrávanie loga zlyhalo.')
    } finally {
      setUploading(null)
    }
  }

  const closePending = () => {
    if (pending) URL.revokeObjectURL(pending.src)
    setPending(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await onSave({
        ...(sponsor?.id ? { id: sponsor.id } : {}),
        name: form.name.trim(),
        description: form.description || null,
        logo_url: logoUrl || null,
        logo_dark_url: logoDarkUrl || null,
        website_url: form.website_url.trim() || null,
        amount: form.amount ? parseFloat(form.amount.replace(',', '.')) : null,
        amount_public: form.amount_public,
        publish_from: form.publish_from || null,
        publish_until: form.publish_until || null,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order, 10) || 0,
        internal_note: form.internal_note || null,
      })
      if (res.success) onClose()
      else setError(res.error || 'Nastala chyba.')
    } catch {
      setError('Nepodarilo sa spojiť so serverom.')
    } finally {
      setLoading(false)
    }
  }

  const LogoField = ({ variant, url, onClear, label, hint }: { variant: Variant; url: string; onClear: () => void; label: string; hint: string }) => {
    const dark = variant === 'dark'
    return (
      <div className="space-y-2">
        <label className={labelCls}>{label}</label>
        {url ? (
          <div className={`relative rounded-2xl overflow-hidden border border-gray-200 group h-32 flex items-center justify-center p-4 ${dark ? 'bg-[#052342]' : 'bg-white'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Logo" className="max-w-full max-h-full object-contain" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label className="p-3 bg-white rounded-full text-blue-700 hover:bg-blue-50 shadow-lg cursor-pointer" title="Nahradiť">
                <Crop size={16} />
                <input type="file" accept="image/*" className="hidden" onChange={pickFile(variant)} disabled={uploading !== null} />
              </label>
              <button type="button" onClick={onClear} className="p-3 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg cursor-pointer" title="Odstrániť">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className={`relative border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${dark ? 'border-blue-900 bg-[#052342] hover:border-blue-500' : 'border-gray-200 bg-gray-50/50 hover:border-blue-500/50 hover:bg-blue-50/10'}`}>
            {uploading === variant ? <Loader2 className="w-7 h-7 text-blue-500 animate-spin" /> : <ImageIcon className={`w-7 h-7 ${dark ? 'text-blue-300' : 'text-gray-300'}`} />}
            <span className={`text-[10px] font-black uppercase tracking-wider ${dark ? 'text-blue-200' : 'text-gray-400'}`}>
              {uploading === variant ? 'Nahrávam…' : 'Kliknutím vyberte logo (max 4 MB)'}
            </span>
            <input type="file" accept="image/*" onChange={pickFile(variant)} disabled={uploading !== null} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        )}
        <p className="text-[10px] text-gray-400 px-1">{hint}</p>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 sticky top-0 z-10">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{sponsor ? 'Upraviť sponzora' : 'Nový sponzor'}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Pás „Podporili nás“ na domovskej stránke</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start gap-3 border border-red-100 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <label className={labelCls}>Názov sponzora *</label>
                <input autoFocus required name="name" value={form.name} onChange={handleChange} placeholder="napr. Firma s.r.o." className={`${inputCls} font-bold text-gray-900`} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Poradie</label>
                <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Web sponzora</label>
              <input name="website_url" type="url" value={form.website_url} onChange={handleChange} placeholder="https://…" className={inputCls} />
              <p className="text-[10px] text-gray-400 px-1">Logo na webe bude odkazovať na túto adresu.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <LogoField variant="light" url={logoUrl} onClear={() => setLogoUrl('')} label="Logo" hint="Zobrazí sa na bielej dlaždici. Po výbere súboru ho môžete orezať." />
              <LogoField variant="dark" url={logoDarkUrl} onClear={() => setLogoDarkUrl('')} label="Logo na tmavý podklad (voliteľné)" hint="Svetlá verzia loga, ak ju sponzor má. Zatiaľ sa používa len ako záloha." />
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Popis (voliteľné)</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="napr. Partner rekonštrukcie ZŠ v Martine" className={`${inputCls} resize-none`} />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className={labelCls}>Výška podpory (€)</label>
                <input name="amount" type="number" step="0.01" min="0" value={form.amount} onChange={handleChange} placeholder="0" className={inputCls} />
              </div>
              <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 transition-all self-end">
                <input type="checkbox" name="amount_public" checked={form.amount_public} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
                <span>
                  <span className="text-sm font-bold text-gray-900 block">Zobraziť sumu na webe</span>
                  <span className="text-[10px] text-gray-400">Inak je suma len interná informácia.</span>
                </span>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={labelCls}>Zverejniť od</label>
                <input name="publish_from" type="date" value={form.publish_from} onChange={handleChange} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Zverejniť do</label>
                <input name="publish_until" type="date" value={form.publish_until} onChange={handleChange} className={inputCls} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 px-1 -mt-3">Prázdne = bez obmedzenia. Po skončení obdobia logo z webu automaticky zmizne.</p>

            <div className="space-y-2">
              <label className={labelCls}>Interná poznámka</label>
              <textarea name="internal_note" value={form.internal_note} onChange={handleChange} rows={2} placeholder="Kontakt, dohoda, faktúra… (nezobrazuje sa na webe)" className={`${inputCls} resize-none`} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 transition-all">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
              <span>
                <span className="text-sm font-bold text-gray-900 block">Aktívny</span>
                <span className="text-[10px] text-gray-400">Neaktívny sponzor sa na webe nezobrazí bez ohľadu na dátumy.</span>
              </span>
            </label>

            <div className="pt-2 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all cursor-pointer">
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={loading || uploading !== null || !form.name.trim()}
                className="flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {sponsor ? 'Uložiť zmeny' : 'Vytvoriť sponzora'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {pending && (
        <LogoCropper
          imageSrc={pending.src}
          fileName={pending.file.name}
          onDone={async (file) => {
            const v = pending.variant
            closePending()
            await upload(v, file)
          }}
          onSkip={async () => {
            const { variant, file } = pending
            closePending()
            await upload(variant, file)
          }}
          onCancel={closePending}
        />
      )}
    </>
  )
}
