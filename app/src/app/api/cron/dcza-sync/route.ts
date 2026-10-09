import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { dioceseDb } from '@/lib/diocese/public'
import { syncKbsDocuments } from '@/lib/diocese/documents'
import { syncFromZachej } from '@/lib/diocese/magazine'

/** Denná synchronizácia webu dcza.sk: dokumenty pápežov z kbs.sk a čísla časopisu zo Zachej.sk. */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const db = dioceseDb()
  const [docs, magazine] = await Promise.allSettled([syncKbsDocuments(db), syncFromZachej(db)])
  revalidatePath('/dcza', 'layout')
  return NextResponse.json({
    kbs: docs.status === 'fulfilled' ? { added: docs.value.added, updated: docs.value.updated, errors: docs.value.errors.length } : String(docs.reason),
    zachej: magazine.status === 'fulfilled' ? { added: magazine.value.added, errors: magazine.value.errors.length } : String(magazine.reason),
  })
}
