import Link from 'next/link'
import { CircleHelp } from 'lucide-react'
import { helpHref, type HelpZone } from '@/lib/help-links'

/** Malý odkaz „?“ pri nadpise záložky alebo sekcie – vedie na návod v Pomoci. */
export default function HelpLink({ zone, slug, label = 'Návod', className = '' }: { zone: HelpZone; slug: string; label?: string; className?: string }) {
  return (
    <Link
      href={helpHref(zone, slug)}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center align-middle text-gray-400 hover:text-blue-600 transition-colors ${className}`}
    >
      <CircleHelp size={18} />
    </Link>
  )
}
