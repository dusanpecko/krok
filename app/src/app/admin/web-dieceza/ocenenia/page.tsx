import { adminLoadAwards } from '../actions'
import AwardsAdmin from '@/components/admin/diocese/AwardsAdmin'

export const dynamic = 'force-dynamic'

export default async function AwardsAdminPage() {
  return <AwardsAdmin data={await adminLoadAwards()} />
}
