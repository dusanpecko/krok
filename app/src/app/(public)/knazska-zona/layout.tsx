import type { Metadata } from 'next'

// neverejná zóna – nikdy do vyhľadávačov
export const metadata: Metadata = {
  title: 'Kňazská zóna | Žilinská diecéza',
  robots: { index: false, follow: false },
}

export default function ClergyZoneLayout({ children }: { children: React.ReactNode }) {
  return children
}
