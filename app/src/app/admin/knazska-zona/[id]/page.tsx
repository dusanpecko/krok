import { notFound } from 'next/navigation'
import { getZoneAdminDoc, getZoneAdminOverview } from '../actions'
import ZoneDocEditor from '@/components/admin/clergy-zone/ZoneDocEditor'

export const dynamic = 'force-dynamic'
// zverejnenie s e-mailom všetkým kňazom (~250 správ) môže trvať dlhšie
export const maxDuration = 300

export default async function ZoneDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [doc, { categories }] = await Promise.all([getZoneAdminDoc(id), getZoneAdminOverview()])
  if (!doc) notFound()
  return <ZoneDocEditor key={doc.updated_at} doc={doc} categories={categories} />
}
