import { notFound } from 'next/navigation'
import { getChangeRequests, getDeaneryOptions, getParishAccess, getParishForAdmin } from '../actions'
import { getParishWebForAdmin } from '../web-actions'
import ParishDetailView from '@/components/admin/parishes/ParishDetailView'

export const dynamic = 'force-dynamic'

export default async function ParishAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [detail, deaneries, access, requests, web] = await Promise.all([
    getParishForAdmin(id),
    getDeaneryOptions(),
    getParishAccess(id),
    getChangeRequests({ parishId: id, status: 'all' }),
    getParishWebForAdmin(id),
  ])
  if (!detail) notFound()
  return <ParishDetailView detail={detail} deaneries={deaneries} access={access} requests={requests} web={web} />
}
