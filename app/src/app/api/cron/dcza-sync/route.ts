import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { dioceseDb } from '@/lib/diocese/public'
import { syncKbsDocuments } from '@/lib/diocese/documents'
import { syncFromZachej } from '@/lib/diocese/magazine'
import { syncAllClergyParishAccess } from '@/lib/parishes/clergy-access'

/**
 * Denná synchronizácia webu dcza.sk: dokumenty pápežov z kbs.sk, čísla časopisu zo Zachej.sk
 * a prístupy do správy farností podľa schematizmu (menovania s dátumom v budúcnosti, napr. od 1. 7.).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const db = dioceseDb()
  const [docs, magazine, access] = await Promise.allSettled([syncKbsDocuments(db), syncFromZachej(db), syncAllClergyParishAccess(db, { sendEmail: true, actorId: null })])
  revalidatePath('/dcza', 'layout')
  return NextResponse.json({
    kbs: docs.status === 'fulfilled' ? { added: docs.value.added, updated: docs.value.updated, errors: docs.value.errors.length } : String(docs.reason),
    parish_access: access.status === 'fulfilled' ? { changed: access.value.length, errors: access.value.filter((r) => r.error).length } : String(access.reason),
    zachej: magazine.status === 'fulfilled' ? { added: magazine.value.added, errors: magazine.value.errors.length } : String(magazine.reason),
  })
}
