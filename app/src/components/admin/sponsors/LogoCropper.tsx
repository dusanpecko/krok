'use client'

import { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { X, Check, Loader2, ZoomIn, Crop } from 'lucide-react'

interface Props {
  /** Object URL alebo data URL pôvodného obrázka */
  imageSrc: string
  fileName: string
  /** Vráti orezané logo ako PNG (zachová priehľadnosť) */
  onDone: (file: File) => Promise<void> | void
  /** Použiť pôvodný súbor bez orezania */
  onSkip: () => Promise<void> | void
  onCancel: () => void
}

const ASPECTS: { label: string; value: number | null }[] = [
  { label: 'Voľný', value: null },
  { label: '1:1', value: 1 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:1', value: 2 },
  { label: '16:9', value: 16 / 9 },
]

const MAX_OUTPUT_WIDTH = 1200

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Obrázok sa nepodarilo načítať.'))
    img.src = src
  })
}

/** Vyreže oblasť z obrázka do PNG. Zmenší na max. 1200 px šírky. */
async function cropToPng(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src)
  const scale = area.width > MAX_OUTPUT_WIDTH ? MAX_OUTPUT_WIDTH / area.width : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.width * scale))
  canvas.height = Math.max(1, Math.round(area.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nie je dostupný.')
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export loga zlyhal.'))), 'image/png')
  })
}

/**
 * Orezanie loga pred nahraním na B2. Voľný alebo pevný pomer strán, zoom,
 * výstup PNG s priehľadnosťou.
 */
export default function LogoCropper({ imageSrc, fileName, onDone, onSkip, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | null>(null)
  const [naturalAspect, setNaturalAspect] = useState<number>(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const handleDone = async () => {
    if (!area) return
    setBusy(true)
    setError(null)
    try {
      const blob = await cropToPng(imageSrc, area)
      const base = fileName.replace(/\.[^.]+$/, '') || 'logo'
      await onDone(new File([blob], `${base}.png`, { type: 'image/png' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Orezanie zlyhalo.')
      setBusy(false)
    }
  }

  const handleSkip = async () => {
    setBusy(true)
    try {
      await onSkip()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Crop size={18} className="text-blue-600" />
            <h3 className="text-base font-black text-gray-900">Orezať logo</h3>
          </div>
          <button type="button" onClick={onCancel} className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 cursor-pointer">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Šachovnica pod priehľadnými logami */}
          <div
            className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-gray-200"
            style={{
              backgroundColor: '#f3f4f6',
              backgroundImage:
                'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
            }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect ?? naturalAspect}
              minZoom={0.5}
              maxZoom={4}
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onMediaLoaded={(m) => setNaturalAspect(m.naturalWidth / m.naturalHeight)}
              showGrid={false}
              style={{ containerStyle: { background: 'transparent' } }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="flex flex-wrap gap-1.5">
              {ASPECTS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setAspect(a.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    aspect === a.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 flex-1 text-xs text-gray-500 font-bold">
              <ZoomIn size={14} />
              <input type="range" min={0.5} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-blue-600" />
            </label>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Potiahnite logo a upravte výrez. „Voľný“ pomer zachová tvar loga, výstup je PNG s priehľadným pozadím.
          </p>

          {error && <p className="text-sm text-red-600 font-bold">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={handleSkip} disabled={busy} className="flex-1 py-3 px-5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50">
              Použiť bez orezania
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={busy || !area}
              className="flex-[2] py-3 px-5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Orezať a nahrať
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
