import { getZoneAdminOverview } from '../actions'
import ZoneDocEditor from '@/components/admin/clergy-zone/ZoneDocEditor'

export const dynamic = 'force-dynamic'

export default async function NewZoneDocPage() {
  const { categories } = await getZoneAdminOverview()
  return <ZoneDocEditor doc={null} categories={categories} />
}
