import type { Metadata } from 'next'
import { getPageTree } from '@/lib/diocese/public'
import { BISHOP_BENO, BISHOP_GALIS, withBishopPages } from '@/lib/diocese/bishops'
import DczaPageFrame from '@/components/dcza/DczaPageFrame'
import BishopProfile from '@/components/dcza/BishopProfile'

export const metadata: Metadata = {
  title: 'Mons. Tomáš Galis',
  description: 'Mons. Tomáš Galis – apoštolský administrátor Žilinskej diecézy, prvý žilinský diecézny biskup (2008 – 2026).',
}

export default async function GalisPage() {
  const tree = withBishopPages(await getPageTree())
  return (
    <DczaPageFrame tree={tree} path={BISHOP_GALIS.path}>
      <BishopProfile bishop={BISHOP_GALIS} other={BISHOP_BENO} otherLabel="Žilinský diecézny biskup" />
    </DczaPageFrame>
  )
}
