import { notFound } from 'next/navigation'
import { getDeaneryOptions, getParishForAdmin } from '../actions'
import ParishDetailView from '@/components/admin/parishes/ParishDetailView'

export const dynamic = 'force-dynamic'

export default async function ParishAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [detail, deaneries] = await Promise.all([getParishForAdmin(id), getDeaneryOptions()])
  if (!detail) notFound()
  return <ParishDetailView detail={detail} deaneries={deaneries} />
}
