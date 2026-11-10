import type { Metadata } from 'next'
import { getPageTree } from '@/lib/diocese/public'
import { BISHOP_BENO, BISHOP_GALIS, withBishopPages } from '@/lib/diocese/bishops'
import DczaPageFrame from '@/components/dcza/DczaPageFrame'
import BishopProfile from '@/components/dcza/BishopProfile'

export const metadata: Metadata = {
  title: 'Biskup – Mons. Peter Beňo',
  description: 'Mons. Peter Beňo – žilinský diecézny biskup, menovaný 10. novembra 2026. Životopis a pôsobenie.',
}

export default async function BishopPage() {
  const tree = withBishopPages(await getPageTree())
  return (
    <DczaPageFrame tree={tree} path={BISHOP_BENO.path}>
      <BishopProfile bishop={BISHOP_BENO} other={BISHOP_GALIS} otherLabel="Apoštolský administrátor" />
    </DczaPageFrame>
  )
}
