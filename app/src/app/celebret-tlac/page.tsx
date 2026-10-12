import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser, getUserAccess } from '@/lib/auth'
import { celebretUrl, getCelebretsByIds } from '@/lib/clergy/celebret'
import { celebretQrSvg } from '@/lib/clergy/celebret-qr'
import { A4Page, CardBack, CardFront, type PrintableCelebret } from '@/components/celebret/CelebretPrint'
import PrintButton from '@/components/celebret/PrintButton'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tlač celebretov', robots: { index: false } }

const PER_SHEET = 10 // 2 × 5 kariet 85 × 54 mm na A4

/**
 * Tlač celebretov (K6): ?ids=…&format=karta|a4. Karty – hárok A4 po 10 (líce), za ním rub so zrkadlovo
 * prehodenými stĺpcami (obojstranná tlač, otočenie po dlhšej strane). Mimo admin layoutu – čistá tlač.
 */
export default async function CelebretPrintPage({ searchParams }: { searchParams: Promise<{ ids?: string; format?: string }> }) {
  const { ids, format } = await searchParams
  const user = await getSessionUser()
  if (!user) redirect('/prihlasenie?redirect=/admin/knazi/celebrety')
  const access = await getUserAccess(user.id)
  if (!access.isAdmin && !access.permissions.includes('view_clergy')) redirect('/admin')

  const list = (ids ?? '').split(',').filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 400)
  const celebrets: PrintableCelebret[] = await Promise.all(
    (await getCelebretsByIds(list)).map(async (c) => ({ ...c, url: celebretUrl(c.token), qrSvg: await celebretQrSvg(celebretUrl(c.token)) })),
  )
  const a4 = format === 'a4'
  const sheets: PrintableCelebret[][] = []
  for (let i = 0; i < celebrets.length; i += PER_SHEET) sheets.push(celebrets.slice(i, i + PER_SHEET))
  // rub: v každom riadku prehodiť ľavú a pravú kartu (pri obojstrannej tlači sa list otáča po dlhšej strane)
  const mirror = (sheet: (PrintableCelebret | null)[]) => {
    const padded = [...sheet, ...Array(PER_SHEET - sheet.length).fill(null)]
    const out: (PrintableCelebret | null)[] = []
    for (let r = 0; r < PER_SHEET / 2; r++) out.push(padded[r * 2 + 1], padded[r * 2])
    return out
  }

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white">
      <style>{`
        @media print { @page { size: A4; margin: 0 } .no-print { display: none !important } body { background: #fff } }
        .cb-sheet { width: 210mm; height: 297mm; padding: 13.5mm 20mm; box-sizing: border-box; display: grid; grid-template-columns: 85mm 85mm; grid-auto-rows: 54mm; background: #fff; margin: 0 auto 8mm; page-break-after: always; font-family: Arial, Helvetica, sans-serif; color: #051b30 }
        .cb-card { width: 85mm; height: 54mm; box-sizing: border-box; overflow: hidden; outline: 0.2mm dashed #cbd5e1 }
        .cb-a4 { width: 210mm; height: 297mm; box-sizing: border-box; background: #fff; margin: 0 auto 8mm; page-break-after: always; font-family: Georgia, 'Times New Roman', serif; color: #051b30 }
        @media print { .cb-sheet, .cb-a4 { margin: 0 } .cb-card { outline: none } }
      `}</style>
      <div className="no-print max-w-[210mm] mx-auto py-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black text-gray-900">{a4 ? 'Celebret A4' : `Karty celebretov (${celebrets.length})`}</p>
          <p className="text-sm text-gray-500">
            {a4
              ? 'Tlačte na A4, mierka 100 %, bez okrajov.'
              : 'Obojstranne, otočenie po dlhšej strane, mierka 100 %, bez okrajov. Za každým hárkom líca nasleduje hárok rubu. Prerušované čiary slúžia na strihanie a pri tlači sa nezobrazia.'}
          </p>
        </div>
        <PrintButton />
      </div>
      {celebrets.length === 0 && <p className="no-print text-center text-gray-500">Žiadne celebrety na tlač.</p>}
      {a4
        ? celebrets.map((c) => <A4Page key={c.id} c={c} />)
        : sheets.map((sheet, i) => (
            <div key={i}>
              <div className="cb-sheet">{sheet.map((c) => <CardFront key={c.id} c={c} />)}</div>
              <div className="cb-sheet">{mirror(sheet).map((c, j) => (c ? <CardBack key={c.id} c={c} /> : <div key={`e${j}`} />))}</div>
            </div>
          ))}
    </div>
  )
}
