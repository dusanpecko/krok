import type { Metadata } from 'next'
import Link from 'next/link'
import { dioceseDb } from '@/lib/diocese/public'
import { getDioceseAlbums } from '@/lib/diocese/gallery'
import AlbumTile from '@/components/dcza/AlbumTile'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Galéria' }

const PER_PAGE = 24

export default async function DczaGallery({ searchParams }: { searchParams: Promise<{ strana?: string }> }) {
  const page = Math.max(1, Number.parseInt((await searchParams).strana ?? '1', 10) || 1)
  const rows = await getDioceseAlbums(dioceseDb(), PER_PAGE + 1, (page - 1) * PER_PAGE)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-wine mb-2">Žilinská diecéza</p>
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-10">Galéria</h1>
      {rows.length === 0 ? (
        <p className="text-mute py-16 text-center">Zatiaľ tu nie sú žiadne albumy.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.slice(0, PER_PAGE).map((a) => (
            <AlbumTile key={a.id} album={a} />
          ))}
        </div>
      )}
      {(page > 1 || rows.length > PER_PAGE) && (
        <div className="flex justify-between mt-10 text-sm font-extrabold">
          {page > 1 ? <Link href={`/galeria?strana=${page - 1}`} className="text-blue hover:underline">← Novšie</Link> : <span />}
          {rows.length > PER_PAGE && <Link href={`/galeria?strana=${page + 1}`} className="text-blue hover:underline">Staršie →</Link>}
        </div>
      )}
    </div>
  )
}
