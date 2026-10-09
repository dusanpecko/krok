import type { Metadata } from 'next'
import { listPublicClergy } from '@/lib/diocese/schematizmus'
import { dioceseDb } from '@/lib/diocese/public'
import ClergyDirectory from '@/components/dcza/ClergyDirectory'
import SchemaNav from '@/components/dcza/SchemaNav'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Schematizmus – kňazi a diakoni', description: 'Kňazi a diakoni Žilinskej diecézy – pôsobenie, dekanát a farnosť.' }

export default async function ClergyListPage() {
  const [clergy, { data: deaneries }] = await Promise.all([listPublicClergy(), dioceseDb().from('deaneries').select('id, name').order('name')])
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Schematizmus</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">Kňazi a diakoni</h1>
      <SchemaNav active="/schematizmus/knazi" />
      <ClergyDirectory clergy={clergy} deaneries={(deaneries ?? []) as { id: string; name: string }[]} />
    </div>
  )
}
