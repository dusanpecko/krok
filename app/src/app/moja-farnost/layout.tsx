import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { siteIconsMetadata } from '@/lib/site-server'
import { LifeBuoy } from 'lucide-react'
import ParishZoneLogout from '@/components/parish-zone/ParishZoneLogout'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Moja farnosť | KROK – Pastoračný fond Žilinskej diecézy',
    robots: { index: false },
    ...(await siteIconsMetadata()),
  }
}

/** Zóna farnosti – mimo /admin, jednoduché rozloženie (návrh farností § 6.2). */
export default function ParishZoneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#002D72] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/moja-farnost" className="flex items-center gap-3">
            <Image src="/logo/logo_w.webp" alt="KROK" width={69} height={40} priority />
            <span className="text-sm font-bold tracking-wide border-l border-white/20 pl-3">Moja farnosť</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/moja-farnost/pomoc" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white">
              <LifeBuoy size={15} /> Pomoc
            </Link>
            <Link href="/" className="text-white/70 hover:text-white">Web KROK</Link>
            <ParishZoneLogout />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
