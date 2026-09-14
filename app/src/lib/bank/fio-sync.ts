import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit'
import { isMolliePayout, MOLLIE_PAYOUT_CATEGORY } from '@/lib/bank/mollie-payout'
import { getAnonymousDonorId, loadProjectLegacyVsMap, normalizeVs } from '@/lib/bank/legacy-project-vs'

/**
 * Synchronizácia transakcií z Fio banky cez REST API (posledných 30 dní).
 *
 * Toto je INTERNÁ implementácia bez autorizácie – volá ju:
 *   - server action `syncFioTransactions` (admin, oprávnenie view_bank),
 *   - cron route /api/cron/sync-bank (overená cez CRON_SECRET, bez session).
 * Preto NIE JE v súbore so 'use server' – tam by bola verejne volateľná.
 */

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Fio: max. 1 volanie za 30 s na token. */
const FIO_MIN_INTERVAL_MS = 30_000
/** Zablokovaná IP na Fio inak nechá fetch visieť donekonečna. */
const FIO_TIMEOUT_MS = 20_000

let lastSyncAttemptAt = 0

export type FioSyncResult =
  | { success: true; total: number; imported: number; matched: number; message?: string }
  | { success: false; error: string }

function isNetworkFailure(err: unknown): boolean {
  const e = err as { name?: string; message?: string; code?: string; cause?: { code?: string } } | null
  const code = e?.cause?.code ?? e?.code ?? ''
  return (
    e?.name === 'TimeoutError' ||
    e?.name === 'AbortError' ||
    ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'].includes(code) ||
    (typeof e?.message === 'string' && e.message.includes('fetch failed'))
  )
}

const parseStringCol = (col: any): string | null => {
  if (!col) return null
  if (typeof col === 'object') {
    return col.value !== undefined && col.value !== null ? String(col.value) : null
  }
  return String(col)
}

const parseNumberCol = (col: any): number | null => {
  if (!col) return null
  if (typeof col === 'object') {
    return col.value !== undefined && col.value !== null ? Number(col.value) : null
  }
  return Number(col)
}

export async function runFioSync(): Promise<FioSyncResult> {
  const token = process.env.FIO_API_TOKEN
  if (!token) {
    return { 
      success: false, 
      error: 'V konfigurácii servera (.env.local) chýba FIO_API_TOKEN. Prepojenie na banku nie je nastavené.' 
    }
  }

  // Fio povoľuje JEDNO volanie za 30 sekúnd na token a pri častejších
  // volaniach dočasne blokuje celú IP adresu na úrovni firewallu (spojenie
  // potom visí / ECONNRESET). Brzda je preto globálna, nie per používateľ:
  //   1) in-memory pre túto inštanciu (funguje aj bez Upstash),
  //   2) Upstash naprieč Vercel inštanciami (fail-open, ak nie je dostupný).
  const now = Date.now()
  const sinceLast = now - lastSyncAttemptAt
  if (sinceLast < FIO_MIN_INTERVAL_MS) {
    const wait = Math.ceil((FIO_MIN_INTERVAL_MS - sinceLast) / 1000)
    return { success: false, error: `Synchronizácia práve prebehla. Fio povoľuje jedno volanie za 30 sekúnd – skúste to znova o ${wait} s.` }
  }
  const { success: allowed } = await checkRateLimit('fio-sync', { limit: 1, window: '30 s', identifier: 'fio-token' })
  if (!allowed) {
    return { success: false, error: 'Synchronizácia práve prebehla z inej inštancie. Fio povoľuje jedno volanie za 30 sekúnd – skúste to o chvíľu.' }
  }
  lastSyncAttemptAt = now

  try {
    // 1. Vypočítaj dátumové rozmedzie (posledných 30 dní)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const dateFrom = formatDate(thirtyDaysAgo)
    const dateTo = formatDate(today)

    // 2. Volanie Fio REST API
    const url = `https://fioapi.fio.cz/v1/rest/periods/${token}/${dateFrom}/${dateTo}/transactions.json`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 0 }, // vypnúť caching v Next.js
      // Zablokovaná IP inak visí donekonečna
      signal: AbortSignal.timeout(FIO_TIMEOUT_MS),
    })

    if (!response.ok) {
      if (response.status === 409) {
        return { 
          success: false, 
          error: 'Fio API vrátilo chybu 409 (Conflict). Banka povoľuje dopyty maximálne raz za 30 sekúnd. Prosím, chvíľu počkajte a skúste to znova.' 
        }
      }
      return { 
        success: false, 
        error: `Chyba pri komunikácii s Fio API banky (Status: ${response.status}).` 
      }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Fio API returned non-JSON response:', text.substring(0, 500))
      return { 
        success: false, 
        error: 'Banka nevrátila očakávaný formát JSON. Skontrolujte prosím správnosť FIO_API_TOKEN v súbore .env.local.' 
      }
    }

    let payload
    try {
      payload = await response.json()
    } catch (parseErr) {
      console.error('Failed to parse Fio JSON payload:', parseErr)
      return {
        success: false,
        error: 'Chyba pri spracovaní odpovede z banky (neplatný formát JSON). Skontrolujte prosím správnosť FIO_API_TOKEN.'
      }
    }
    const accountStatement = payload?.accountStatement
    if (!accountStatement) {
      return { success: false, error: 'Fio API vrátilo nekompletnú alebo neplatnú štruktúru dát.' }
    }

    const info = accountStatement.info
    const accountIban = info?.iban || 'Neznámy IBAN'
    const openingBalance = info?.openingBalance !== undefined ? parseFloat(info.openingBalance) : 0
    const closingBalance = info?.closingBalance !== undefined ? parseFloat(info.closingBalance) : 0

    const transactionList = accountStatement.transactionList?.transaction
    const rawTransactions = Array.isArray(transactionList)
      ? transactionList
      : (transactionList ? [transactionList] : [])

    if (rawTransactions.length === 0) {
      return { success: true, total: 0, imported: 0, matched: 0, message: 'Nenašli sa žiadne nové platby za toto obdobie.' }
    }

    // 3. Ochrana pred duplicitami
    // Vytiahneme unikátne IDčka (column22) zo všetkých stiahnutých transakcií
    const entryRefs = rawTransactions
      .map((tx: any) => parseStringCol(tx.column22))
      .filter((ref: string | null): ref is string => ref !== null)

    if (entryRefs.length === 0) {
      return { success: true, total: rawTransactions.length, imported: 0, matched: 0, message: 'Transakcie neobsahovali unikátne ID pohybu.' }
    }

    // Zistíme, ktoré entry_ref už máme v databáze
    const { data: existingTxs, error: existError } = await supabaseAdmin
      .from('bank_transactions')
      .select('entry_ref')
      .in('entry_ref', entryRefs)

    if (existError) {
      console.error('Error checking existing transactions:', existError)
      return { success: false, error: 'Chyba pri kontrole existujúcich transakcií v databáze.' }
    }

    const existingRefsSet = new Set(existingTxs?.map(tx => tx.entry_ref) || [])

    // Odfiltrujeme len tie transakcie, ktoré EŠTE NEMÁME v databáze
    const newTransactions = rawTransactions.filter((tx: any) => {
      const entryRef = parseStringCol(tx.column22)
      return entryRef && !existingRefsSet.has(entryRef)
    })

    if (newTransactions.length === 0) {
      return {
        success: true,
        total: rawTransactions.length,
        imported: 0,
        matched: 0,
        message: 'Všetky stiahnuté transakcie už boli importované v minulosti.'
      }
    }

    // 4. Vytvoríme importnú dávku (batch)
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('bank_import_batches')
      .insert({
        filename: `Fio API Sync – ${formatDate(new Date())} (${dateFrom} - ${dateTo})`,
        iban: accountIban,
        period_from: dateFrom,
        period_to: dateTo,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        total_entries: newTransactions.length
      })
      .select()
      .single()

    if (batchError || !batch) {
      console.error('Batch creation error:', batchError)
      return { success: false, error: 'Zlyhalo vytvorenie importnej dávky v databáze.' }
    }

    // 5. Načítame darcov a projekty pre in-memory párovanie (presne ako v XML importe)
    const { data: donors } = await supabaseAdmin.from('donors').select('id, variable_symbol')
    const donorVsMap = new Map<string, string>()
    if (donors) {
      donors.forEach(d => {
        if (d.variable_symbol) donorVsMap.set(d.variable_symbol, d.id)
      })
    }

    const { data: projects } = await supabaseAdmin.from('projects').select('id, specific_symbol')
    const projectSsMap = new Map<string, string>()
    if (projects) {
      projects.forEach(p => {
        if (p.specific_symbol) projectSsMap.set(p.specific_symbol, p.id)
      })
    }

    // VS výziev zo starého webu (bežiace trvalé príkazy) → dar k výzve cez systémového anonymného darcu
    const projectLegacyVsMap = await loadProjectLegacyVsMap(supabaseAdmin)
    const anonymousDonorId = projectLegacyVsMap.size > 0 ? await getAnonymousDonorId(supabaseAdmin) : null

    // 6. Spracovanie a mapovanie transakcií
    const txToInsert = []
    let matchedCount = 0

    for (const tx of newTransactions) {
      const entryRef = parseStringCol(tx.column22)
      if (!entryRef) continue

      const amountVal = parseNumberCol(tx.column1) || 0
      const amount = Math.abs(amountVal)
      
      const currency = parseStringCol(tx.column14) || 'EUR'
      const direction = amountVal > 0 ? 'credit' : 'debit'
      
      const bookingDateRaw = parseStringCol(tx.column0) || new Date().toISOString()
      const bookingDate = bookingDateRaw.substring(0, 10) // očakáva sa YYYY-MM-DD
      
      const counterIban = parseStringCol(tx.column17)
      const counterBic = parseStringCol(tx.column18)
      
      // Meno protiúčtu – vyskúšame viacero stiahnutých polí pre maximálne pokrytie
      const counterName = parseStringCol(tx.column10) || parseStringCol(tx.column7) || null

      const constantSymbol = parseStringCol(tx.column4)
      const remittanceInfo = parseStringCol(tx.column16)

      // Extrakcia VS a SS
      let vs = null
      let ss = null

      const vsRaw = parseStringCol(tx.column5)
      if (vsRaw) {
        vs = vsRaw.replace(/^0+/, '')
        if (vs === '') vs = '0'
      }

      const ssRaw = parseStringCol(tx.column6)
      if (ssRaw) {
        ss = ssRaw
      }

      // Rozhodnutie o párovaní
      let matchedDonorId = null
      let isMatched = false
      let category = direction === 'credit' ? 'unmatched' : 'expense_other'

      // Výplata z Mollie = hromadný prevod online darov, ktoré už máme v donations
      // → nikdy nepárovať na darcu (dvojité započítanie).
      if (direction === 'credit' && isMolliePayout({ direction, counterparty_name: counterName, counterparty_iban: counterIban, remittance_info: remittanceInfo })) {
        category = MOLLIE_PAYOUT_CATEGORY
      } else if (direction === 'credit' && vs) {
        if (donorVsMap.has(vs)) {
          matchedDonorId = donorVsMap.get(vs)
          isMatched = true
          category = 'donation'
        } else if (anonymousDonorId && projectLegacyVsMap.has(normalizeVs(vs))) {
          // VS patrí výzve zo starého webu, nie darcovi → anonymný dar k výzve
          matchedDonorId = anonymousDonorId
          isMatched = true
          category = 'donation'
        }
      }

      txToInsert.push({
        entry_ref: entryRef,
        message_id: 'FIO_API_SYNC',
        amount: amount,
        currency: currency,
        direction: direction,
        booking_date: bookingDate,
        counterparty_iban: counterIban,
        counterparty_bic: counterBic,
        counterparty_name: counterName,
        variable_symbol: vs,
        specific_symbol: ss,
        constant_symbol: constantSymbol,
        remittance_info: remittanceInfo,
        donor_id: matchedDonorId,
        matched: isMatched,
        category: category,
        import_batch_id: batch.id
      })

      if (isMatched) matchedCount++
    }

    // Zápis do DB
    const { data: insertedTxs, error: insertError } = await supabaseAdmin
      .from('bank_transactions')
      .insert(txToInsert)
      .select()

    if (insertError) {
      console.error('Fio API sync insertion error:', insertError)
      return { success: false, error: 'Zlyhalo uloženie transakcií do databázy.' }
    }

    // 7. Automatické priradenie k darom (donations) pre úspešne spárované
    if (insertedTxs && insertedTxs.length > 0) {
      const matchedTxs = insertedTxs.filter(tx => tx.matched === true)

      if (matchedTxs.length > 0) {
        const donationsToInsert = matchedTxs.map(tx => {
          const pId =
            (tx.specific_symbol && projectSsMap.has(tx.specific_symbol) ? projectSsMap.get(tx.specific_symbol) : null) ??
            projectLegacyVsMap.get(normalizeVs(tx.variable_symbol)) ??
            null

          return {
            donor_id: tx.donor_id,
            bank_transaction_id: tx.id,
            project_id: pId,
            amount: tx.amount,
            donation_date: tx.booking_date,
            payment_method: 'bank_transfer',
            matched: true
          }
        })

        const { error: donationsError } = await supabaseAdmin
          .from('donations')
          .insert(donationsToInsert)

        if (donationsError) {
          console.error('Error inserting donations during API sync:', donationsError)
        }
      }
    }

    revalidatePath('/admin/banka')
    return {
      success: true,
      total: rawTransactions.length,
      imported: newTransactions.length,
      matched: matchedCount
    }

  } catch (err: any) {
    console.error('Fio API sync exception:', err)
    if (isNetworkFailure(err)) {
      return {
        success: false,
        error: 'Fio API neodpovedá (spojenie zamietnuté alebo vypršalo). Banka pravdepodobne dočasne blokuje túto IP adresu po častých volaniach – počkajte a skúste to neskôr.',
      }
    }
    return { success: false, error: err.message || 'Neočakávaná chyba počas bankovej synchronizácie.' }
  }
}
