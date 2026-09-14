import { NextResponse, type NextRequest } from 'next/server'
import { processMolliePayment } from '@/lib/mollie/process-payment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAYMENT_ID_RE = /^tr_[A-Za-z0-9]+$/

/**
 * Mollie webhook.
 * Mollie posiela POST `id=tr_xxx` (application/x-www-form-urlencoded).
 * Telu sa nedôveruje – stav sa vždy sťahuje z Mollie API.
 *
 * Odpoveď: 200 = spracované; iný kód → Mollie webhook zopakuje (do ~26 h),
 * preto pri dočasnej chybe (DB, sieť) vraciame 500.
 */
export async function POST(req: NextRequest) {
  let paymentId: string | null = null
  try {
    const body = await req.text()
    paymentId = new URLSearchParams(body).get('id')
  } catch {
    // prázdne / nečitateľné telo
  }

  if (!paymentId || !PAYMENT_ID_RE.test(paymentId)) {
    return new NextResponse('Missing or invalid id', { status: 400 })
  }

  try {
    const result = await processMolliePayment(paymentId)
    console.log(`[mollie] webhook ${paymentId}: ${result.kind} ${result.status} ${result.amount} €`)
    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    const code = (err as { statusCode?: number })?.statusCode
    if (code === 404) {
      // Neznáma platba (cudzí režim test/live alebo uhádnuté ID) – neopakovať
      console.warn(`[mollie] webhook: platba ${paymentId} neexistuje`)
      return new NextResponse('Unknown payment', { status: 200 })
    }
    console.error(`[mollie] webhook ${paymentId} zlyhal:`, err instanceof Error ? err.message : err)
    return new NextResponse('Processing failed', { status: 500 })
  }
}
