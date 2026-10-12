import { notFound } from 'next/navigation'
import { getClergy } from '../actions'
import { getClergyCelebretData } from '../celebrety/actions'
import { celebretBaseUrl } from '@/lib/clergy/celebret'
import ClergyDetailView from '@/components/admin/clergy/ClergyDetailView'

export const dynamic = 'force-dynamic'

export default async function ClergyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const detail = await getClergy(id)
  if (!detail) notFound()
  // celebret (K6) len pre kňazov a biskupa
  const celebret = ['priest', 'bishop'].includes(detail.person.category ?? '') ? await getClergyCelebretData(id) : null
  return <ClergyDetailView detail={detail} celebret={celebret} celebretBase={celebretBaseUrl()} />
}
