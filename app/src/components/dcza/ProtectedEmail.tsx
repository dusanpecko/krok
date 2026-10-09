'use client'

import { useSyncExternalStore } from 'react'
import { Mail } from 'lucide-react'
import { decodeEmail } from '@/lib/diocese/email-code'

const subscribeNoop = () => () => {}

/** E-mail, ktorý sa poskladá až v prehliadači – v HTML zo servera nie je (ochrana pred botmi). */
export default function ProtectedEmail({ code, className, iconSize = 14, icon = true }: { code: string; className?: string; iconSize?: number; icon?: boolean }) {
  const email = useSyncExternalStore(subscribeNoop, () => decodeEmail(code), () => null)
  if (!email) return <span className={className} aria-hidden>&nbsp;</span>
  return (
    <a href={`mailto:${email}`} className={className}>
      {icon && <Mail size={iconSize} className="shrink-0" />} {email}
    </a>
  )
}
