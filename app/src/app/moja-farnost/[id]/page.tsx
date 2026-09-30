import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { ParishForbiddenError } from '@/lib/parishes/access'
import { getMyParishView } from '../actions'
import ParishZoneView from '@/components/parish-zone/ParishZoneView'

export const dynamic = 'force-dynamic'

export default async function MyParishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/prihlasenie?redirect=${encodeURIComponent(`/moja-farnost/${id}`)}`)
  let view: Awaited<ReturnType<typeof getMyParishView>>
  try {
    view = await getMyParishView(id)
  } catch (e) {
    if (e instanceof ParishForbiddenError) redirect('/moja-farnost')
    notFound()
  }
  return <ParishZoneView view={view} />
}
