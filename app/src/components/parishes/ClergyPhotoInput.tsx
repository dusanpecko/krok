'use client'

import { useState } from 'react'
import { Loader2, Upload, User, X } from 'lucide-react'

type Uploader = (formData: FormData) => Promise<{ url?: string; error?: string }>

/** Foto kňaza (§ 3.8) – okrúhly náhľad ako na verejnej stránke, nahratie a odstránenie. Ukladá sa až s riadkom. */
export default function ClergyPhotoInput({
  value,
  onChange,
  uploader,
  onError,
  size = 'md',
}: {
  value: string | null
  onChange: (url: string | null) => void
  uploader: Uploader
  onError: (text: string) => void
  size?: 'sm' | 'md'
}) {
  const [uploading, setUploading] = useState(false)
  const dim = size === 'sm' ? 'w-9 h-9' : 'w-14 h-14'

  const upload = async (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return onError('Nahrajte fotku (JPG, PNG, WebP).')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploader(fd)
    setUploading(false)
    if (res.url) onChange(res.url)
    else onError(res.error ?? 'Nahrávanie zlyhalo.')
  }

  return (
    <div className="flex items-center gap-2">
      <label className={`${dim} relative rounded-full border border-gray-200 bg-gray-50 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center text-gray-300 hover:border-gray-400`} title="Nahrať fotku">
        {uploading ? (
          <Loader2 size={16} className="animate-spin text-gray-400" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={size === 'sm' ? 16 : 22} />
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f) }} />
      </label>
      {value ? (
        <button type="button" onClick={() => onChange(null)} className="text-xs font-bold text-gray-400 hover:text-red-600 inline-flex items-center gap-1" title="Odstrániť fotku">
          <X size={12} /> {size === 'md' && 'Odstrániť'}
        </button>
      ) : (
        size === 'md' && <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Upload size={12} /> Foto</span>
      )}
    </div>
  )
}
