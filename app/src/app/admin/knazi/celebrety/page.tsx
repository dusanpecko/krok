import { getCelebretOverview } from './actions'
import CelebretOverview from '@/components/admin/clergy/CelebretOverview'

export const dynamic = 'force-dynamic'

export default async function CelebretsPage() {
  const data = await getCelebretOverview()
  return <CelebretOverview {...data} />
}
