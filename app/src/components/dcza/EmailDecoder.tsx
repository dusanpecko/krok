'use client'

import { useEffect } from 'react'
import { decodeEmail } from '@/lib/diocese/email-code'

/** Doplní adresy chránené cez protectEmails (a[data-ml]) – až v prehliadači, boti ich v HTML nevidia. */
export default function EmailDecoder() {
  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>('a[data-ml]').forEach((a) => {
      const email = decodeEmail(a.dataset.ml ?? '')
      if (!email) return
      a.href = `mailto:${email}`
      if (a.textContent?.trim() === 'e-mail') a.textContent = email
      else a.innerHTML = a.innerHTML.replace(/e-mail/g, email)
      a.removeAttribute('data-ml')
    })
  })
  return null
}
