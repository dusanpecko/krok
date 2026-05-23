'use client'

import { useRef, useState, useEffect } from 'react'
import { RotateCcw, Undo2 } from 'lucide-react'

interface SignaturePadProps {
  onChange: (base64Data: string | null) => void
  value?: string
  required?: boolean
}

export default function SignaturePad({ onChange, value, required = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [history, setHistory] = useState<string[]>([])

  // Inicializácia a prispôsobenie DPI
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Nastavenie štýlu čiary
    ctx.strokeStyle = '#002D72' // KROK Tmavomodrá
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Ak už hodnota existuje (napr. pri editácii vráteného projektu)
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        setIsEmpty(false)
      }
      img.src = value
    }

    // Zabránenie scrolovaniu na mobile pri kreslení
    const preventDefault = (e: Event) => {
      if (e.target === canvas) {
        e.preventDefault()
      }
    }
    document.body.addEventListener('touchstart', preventDefault, { passive: false })
    document.body.addEventListener('touchmove', preventDefault, { passive: false })

    return () => {
      document.body.removeEventListener('touchstart', preventDefault)
      document.body.removeEventListener('touchmove', preventDefault)
    }
  }, [value])

  const saveToHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL()
    setHistory((prev) => [...prev, dataUrl])
  }

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    // Zisťovanie súradníc pre touch aj mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Uložiť súčasný stav do histórie pred kreslením nového ťahu
    saveToHistory()

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: any) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setIsEmpty(false)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    // Odovzdať base64 dáta do formulára
    const canvas = canvasRef.current
    if (canvas) {
      onChange(canvas.toDataURL())
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    setHistory([])
    onChange(null)
  }

  const handleUndo = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    if (history.length === 0) {
      handleClear()
      return
    }

    const previousState = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    setHistory(newHistory)

    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      onChange(canvas.toDataURL())
    }
    img.src = previousState
  }

  return (
    <div className="w-full">
      <div className="relative rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-md shadow-inner overflow-hidden">
        {/* Canvas pad */}
        <canvas
          ref={canvasRef}
          width={700}
          height={280}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[200px] cursor-crosshair block touch-none"
        />

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-gray-300 text-sm font-medium tracking-wide">Sem napíšte svoj podpis</span>
          </div>
        )}
      </div>

      {/* Ovládacie tlačidlá pre podpis */}
      <div className="flex justify-end gap-3 mt-3">
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0 && isEmpty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Undo2 size={13} />
          Späť
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RotateCcw size={13} />
          Vymazať
        </button>
      </div>
    </div>
  )
}
