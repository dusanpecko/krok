'use client'

import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Tlačiť' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 cursor-pointer">
      <Printer size={16} /> {label}
    </button>
  )
}
