'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Link2, Mail, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react'

/**
 * Zdieľanie stránky farnosti, oznamov, aktualít, albumov a fotiek (pripomienky Julie, 2026-10-08).
 * Na dotykovom zariadení otvorí systémové zdieľanie (Messenger, WhatsApp, Instagram…), inak ponuku
 * Facebook / WhatsApp / X / e-mail / kopírovať odkaz. `text` = pripravený text príspevku (zóna farnosti).
 */
export default function ShareButton({
  path,
  title,
  text,
  label = 'Zdieľať',
  className = '',
  iconOnly = false,
  align = 'left',
  tone = 'light',
  bare = false,
}: {
  /** relatívna cesta (/farnosti/…) alebo celá adresa */
  path: string
  title: string
  text?: string
  label?: string
  className?: string
  iconOnly?: boolean
  align?: 'left' | 'right'
  /** dark = tlačidlo na tmavom pozadí (lightbox) */
  tone?: 'light' | 'dark'
  /** vzhľad tlačidla úplne z `className` (napr. tlačidlá v zóne farnosti) */
  bare?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'link' | 'text' | null>(null)
  const [canNative, setCanNative] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator je dostupný až v prehliadači
    setCanNative(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const url = () => (path.startsWith('http') ? path : `${window.location.origin}${path}`)
  const enc = encodeURIComponent

  const native = async () => {
    try {
      await navigator.share({ title, text: text ?? title, url: url() })
      setOpen(false)
    } catch {
      /* používateľ zdieľanie zrušil */
    }
  }

  const onTrigger = (e: React.MouseEvent) => {
    e.stopPropagation()
    // na mobile rovno systémové zdieľanie, na počítači vlastná ponuka
    if (canNative && window.matchMedia('(pointer: coarse)').matches) return void native()
    setOpen((o) => !o)
  }

  const copy = async (kind: 'link' | 'text') => {
    const value = kind === 'link' ? url() : `${text ?? title}\n\n${url()}`
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      window.prompt('Skopírujte:', value)
    }
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  const popup = (href: string) => {
    window.open(href, 'share', 'width=640,height=560,noopener')
    setOpen(false)
  }

  const item = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-gray-800 hover:bg-gray-100 cursor-pointer text-left'
  const triggerCls = bare
    ? ''
    : tone === 'dark'
      ? 'p-2 rounded-full text-white/85 hover:bg-white/10'
      : iconOnly
        ? 'p-2 rounded-full border border-current/20 hover:bg-black/5'
        : 'inline-flex items-center gap-1.5 text-sm font-extrabold hover:underline'

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onTrigger} aria-label={label} title={label} aria-expanded={open} className={`${triggerCls} cursor-pointer ${className}`}>
        <Share2 size={iconOnly || tone === 'dark' ? 18 : 15} />
        {!iconOnly && tone !== 'dark' && label}
      </button>
      {open && (
        <div className={`absolute z-[120] mt-2 w-64 rounded-2xl bg-white border border-gray-200 shadow-xl p-2 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <button type="button" className={item} onClick={() => popup(`https://www.facebook.com/sharer/sharer.php?u=${enc(url())}`)}>
            <span className="w-7 h-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-sm font-black">f</span> Facebook
          </button>
          <button type="button" className={item} onClick={() => popup(`https://wa.me/?text=${enc(`${text ?? title} ${url()}`)}`)}>
            <span className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center">
              <MessageCircle size={15} />
            </span>
            WhatsApp
          </button>
          <button type="button" className={item} onClick={() => popup(`https://x.com/intent/post?url=${enc(url())}&text=${enc(title)}`)}>
            <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-black">X</span> X (Twitter)
          </button>
          <a className={item} href={`mailto:?subject=${enc(title)}&body=${enc(`${text ?? title}\n\n${url()}`)}`} onClick={() => setOpen(false)}>
            <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
              <Mail size={15} />
            </span>
            E-mail
          </a>
          <div className="my-1 h-px bg-gray-100" />
          <button type="button" className={item} onClick={() => copy('link')}>
            <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">{copied === 'link' ? <Check size={15} /> : <Link2 size={15} />}</span>
            {copied === 'link' ? 'Odkaz skopírovaný' : 'Kopírovať odkaz'}
          </button>
          {text && (
            <button type="button" className={item} onClick={() => copy('text')}>
              <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">{copied === 'text' ? <Check size={15} /> : <Copy size={15} />}</span>
              {copied === 'text' ? 'Text skopírovaný' : 'Kopírovať text s odkazom'}
            </button>
          )}
          {canNative && (
            <button type="button" className={item} onClick={native}>
              <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <MoreHorizontal size={15} />
              </span>
              Ďalšie možnosti…
            </button>
          )}
        </div>
      )}
    </div>
  )
}
