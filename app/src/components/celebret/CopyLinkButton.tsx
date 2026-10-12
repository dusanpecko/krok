'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** Skopíruje overovaciu adresu celebretu (napr. na zápis do NFC čipu karty). */
export default function CopyLinkButton({ url, className = '' }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Skopírujte odkaz:', url) // starší prehliadač / bez povolenia schránky
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button type="button" onClick={copy} className={className} title={url}>
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {copied ? 'Skopírované' : 'Kopírovať odkaz'}
    </button>
  )
}
