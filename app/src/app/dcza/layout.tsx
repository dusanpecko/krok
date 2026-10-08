import type { Metadata } from 'next'
import Link from 'next/link'

/** Web diecézy dcza.sk (krok_navrh_farnosti.md § 20). Na dcza.sk sem middleware prepisuje všetky nespoločné cesty. */
export const metadata: Metadata = {
  title: { default: 'Žilinská diecéza', template: '%s | Žilinská diecéza' },
  description: 'Rímskokatolícka cirkev – Žilinská diecéza: aktuality, biskup, kúria, farnosti, kňazi.',
}

export default function DczaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-paper-warm text-ink">
      <header className="border-b border-blue/10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tight">
            Žilinská diecéza
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-bold text-ink/80">
            <Link href="/farnosti" className="hover:text-blue">Farnosti</Link>
            <Link href="/knazska-zona" className="hover:text-blue">Kňazská zóna</Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-blue-deep text-white/70 text-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">Biskupský úrad Žilina · Jána Kalinčiaka 1, 010 01 Žilina</div>
      </footer>
    </div>
  )
}
