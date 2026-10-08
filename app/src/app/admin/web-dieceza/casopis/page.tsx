import { adminListMagazine } from '../actions'
import MagazineAdmin from '@/components/admin/diocese/MagazineAdmin'

export const dynamic = 'force-dynamic'
// načítanie zo Zachej.sk (obálky) môže trvať dlhšie
export const maxDuration = 300

export default async function MagazineAdminPage() {
  return <MagazineAdmin issues={await adminListMagazine()} />
}
