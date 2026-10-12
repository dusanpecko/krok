import { getCelebretSettingsHistory } from '../actions'
import CelebretSettingsForm from '@/components/admin/clergy/CelebretSettingsForm'

export const dynamic = 'force-dynamic'

export default async function CelebretSettingsPage() {
  const history = await getCelebretSettingsHistory()
  return <CelebretSettingsForm history={history} />
}
