import { notFound } from 'next/navigation'
import { getClergy } from '../actions'
import ClergyDetailView from '@/components/admin/clergy/ClergyDetailView'

export const dynamic = 'force-dynamic'

export default async function ClergyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const detail = await getClergy(id)
  if (!detail) notFound()
  return <ClergyDetailView detail={detail} />
}
