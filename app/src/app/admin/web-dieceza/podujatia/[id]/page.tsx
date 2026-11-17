import { notFound } from 'next/navigation'
import { adminLoadEvent } from '../actions'
import EventAdmin from '@/components/admin/diocese/EventAdmin'

export const dynamic = 'force-dynamic'

export default async function EventAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await adminLoadEvent(id)
  if (!data) notFound()
  return <EventAdmin data={data} />
}
