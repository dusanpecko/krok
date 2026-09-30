import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { runFioSync } from '@/lib/bank/fio-sync'

/** Denný prepočet stavu darcov (aktívny = dar za 12 mesiacov) – migrácia 028. */
async function refreshDonorStatuses() {
  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await admin.rpc('refresh_donor_statuses')
  if (error) {
    console.error('Cron: refresh_donor_statuses failed:', error.message)
    return null
  }
  return Array.isArray(data) ? data[0] : data
}

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
    // Interná implementácia bez session – server action by tu spadla na requirePermission.
    const result = await runFioSync()
    // Stav darcov prepočítame vždy (aj keď sync zlyhal – mení sa aj plynutím času)
    const statuses = await refreshDonorStatuses()

    if (result.success) {
      console.log(`Cron sync success: Total fetched: ${result.total}, Mapped: ${result.matched}`)
      return NextResponse.json({
        status: 'success',
        message: 'Synchronizácia banky prebehla úspešne cez Vercel Cron.',
        details: {
          total: result.total,
          imported: result.imported,
          matched: result.matched,
          message: result.message,
          donorStatuses: statuses,
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
