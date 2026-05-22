import { NextResponse } from 'next/server'
import { syncFioTransactions } from '@/app/admin/banka/actions'

// Hasiť statický build: zabezpečiť, že táto API cesta je plne dynamická a nebude sa cachovať pri next build
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Zabezpečenie: Vercel automaticky posiela Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized cron trigger attempt blocked.')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    console.log('Cron triggered: Starting automated Fio Bank synchronization...')
    const result = await syncFioTransactions()

    if (result.success) {
      console.log(`Cron sync success: Total fetched: ${result.total}, Mapped: ${result.matched}`)
      return NextResponse.json({
        status: 'success',
        message: 'Synchronizácia banky prebehla úspešne cez Vercel Cron.',
        details: {
          total: result.total,
          imported: result.imported,
          matched: result.matched,
          message: result.message
        }
      })
    } else {
      console.error('Cron sync failed:', result.error)
      return NextResponse.json({
        status: 'error',
        message: result.error || 'Zlyhalo spracovanie transakcií z banky.'
      }, { status: 500 })
    }
  } catch (err: any) {
    console.error('Cron sync exception:', err)
    return NextResponse.json({
      status: 'exception',
      error: err.message || 'Neočakávaná chyba počas automatickej synchronizácie.'
    }, { status: 500 })
  }
}
