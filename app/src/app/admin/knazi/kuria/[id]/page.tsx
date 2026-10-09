import { notFound } from 'next/navigation'
import { getBody } from '../actions'
import { BodyEditor } from '@/components/admin/clergy/BodiesView'

export const dynamic = 'force-dynamic'

export default async function BodyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const detail = await getBody(id)
  if (!detail) notFound()
  return <BodyEditor key={detail.body.id} detail={detail} />
}
