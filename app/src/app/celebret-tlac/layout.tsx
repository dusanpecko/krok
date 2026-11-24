import type { Metadata } from 'next'
import { siteIcons } from '@/lib/site'

/** Celebret je doklad diecézy – vždy erb (aj na celebret.dcza.sk, kde middleware web neurčuje). */
export const metadata: Metadata = { icons: siteIcons('dcza') }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
