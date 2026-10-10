'use client'

import { useEffect } from 'react'
import { decodeEmail } from '@/lib/email-code'

function decodeAll() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-ml]').forEach((a) => {
    const email = decodeEmail(a.dataset.ml ?? '')
    if (!email) return
    a.href = `mailto:${email}`
    if (a.textContent?.trim() === 'e-mail') a.textContent = email
    else a.innerHTML = a.innerHTML.replace(/e-mail/g, email)
    a.removeAttribute('data-ml')
  })
}

/**
 * Doplní adresy chránené cez protectEmails (a[data-ml]) – až v prehliadači, boti ich v HTML nevidia.
 * Je raz v hlavnom layoute (oba weby); MutationObserver zachytí aj obsah po navigácii a dočítaní stránky.
 */
export default function EmailDecoder() {
  useEffect(() => {
    decodeAll()
    const observer = new MutationObserver(decodeAll)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return null
}
