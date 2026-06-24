'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Získa zoznam unikátnych rokov z importovaných dávok.
 */
export async function getBankYears() {
  const [{ data: oldest }, { data: newest }] = await Promise.all([
    supabaseAdmin.from('bank_transactions').select('booking_date').order('booking_date', { ascending: true }).limit(1),
    supabaseAdmin.from('bank_transactions').select('booking_date').order('booking_date', { ascending: false }).limit(1)
  ])

  const years = new Set<number>()
  
  if (oldest && oldest[0]?.booking_date && newest && newest[0]?.booking_date) {
    const startYear = new Date(oldest[0].booking_date).getFullYear()
    const endYear = new Date(newest[0].booking_date).getFullYear()
    for (let y = startYear; y <= endYear; y++) {
      years.add(y)
    }
  }

  // Merging with batch periods as fallback/supplement
  const { data: batches } = await supabaseAdmin
    .from('bank_import_batches')
    .select('period_from, period_to')

  if (batches) {
    batches.forEach((batch) => {
      if (batch.period_from) years.add(new Date(batch.period_from).getFullYear())
      if (batch.period_to) years.add(new Date(batch.period_to).getFullYear())
    })
  }

  // Fallback if no data is found
  if (years.size === 0) {
    years.add(new Date().getFullYear())
  }

  return Array.from(years).sort((a, b) => b - a) // Od najnovšieho po najstarší
}

/**
 * Hlavný filter bankových transakcií.
 */
export async function getTransactions(params: {
  year: number
  month: number | 'all'
  status: 'all' | 'matched' | 'unmatched'
  search: string
  page: number
}) {
  const pageSize = 50
  const from = (params.page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabaseAdmin
    .from('bank_transactions')
    .select(`
      *,
      donors ( id, first_name, last_name, vs:variable_symbol )
    `, { count: 'exact' })

  // 1. Dátumy (Rok a voliteľne mesiac)
  let startDate, endDate
  if (params.month !== 'all') {
    startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`
    // Trik pre získanie posledného dňa v mesiaci
    const endDateObj = new Date(params.year, params.month, 0) 
    endDate = `${params.year}-${String(params.month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
  } else {
    startDate = `${params.year}-01-01`
    endDate = `${params.year}-12-31`
  }

  query = query.gte('booking_date', startDate).lte('booking_date', endDate)

  // 2. Status
  if (params.status === 'matched') {
    query = query.eq('matched', true)
  } else if (params.status === 'unmatched') {
    query = query.eq('matched', false)
  }

  // 3. Search
  if (params.search && params.search.length > 2) {
    query = query.or(`counterparty_name.ilike.%${params.search}%,counterparty_iban.ilike.%${params.search}%,variable_symbol.ilike.%${params.search}%,remittance_info.ilike.%${params.search}%`)
  }

  // 4. Zoradenie a stránkovanie
  const { data, error, count } = await query
    .order('booking_date', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching transactions:', error)
    return { data: [], count: 0, totalPages: 0 }
  }

  return {
    data,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize)
  }
}

/**
 * Získa list darcov pre manuálne párovanie.
 */
export async function searchDonors(query: string) {
  if (!query || query.length < 2) return []

  // Najskôr skúsime vyhľadávanie bez diakritiky pomocou RPC funkcie v databáze
  const { data, error } = await supabaseAdmin
    .rpc('search_donors_unaccent', { search_query: query })

  if (error) {
    console.warn('RPC search_donors_unaccent failed or not found, using fallback search:', error)
    
    // Robustný fallback: vyhľadávanie pomocou pôvodného .or() filtra (v prípade, že kľúč v DB ešte nebol spustený)
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('donors')
      .select('id, first_name, last_name, email, variable_symbol, city')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,variable_symbol.ilike.%${query}%`)
      .limit(20)

    if (fallbackError) {
      console.error('Error searching donors (fallback):', fallbackError)
      return []
    }

    return fallbackData
  }

  return data
}

/**
 * Získa zoznam projektov.
 */
export async function getProjects() {
  const { data } = await supabaseAdmin.from('projects').select('id, name, specific_symbol')
  return data || []
}

/**
 * Manuálne spárovanie transakcie s Darcom (a poprípade s Projektom)
 * Vytvorí aj paralelný záznam v analytickej DB (donations).
 */
export async function matchTransaction(
  transactionId: string, 
  donorId: string, 
  projectId?: string | null
) {
  // 1. Zisti informácie o transakcii
  const { data: tx, error: txError } = await supabaseAdmin
    .from('bank_transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (txError || !tx) {
    return { success: false, error: 'Transakcia nebola nájdená.' }
  }

  if (tx.direction !== 'credit') {
    return { success: false, error: 'Iba prichádzajúce platby môžu byť spárované.' }
  }

  // 2. Prepíš transakciu
  const { error: matchError } = await supabaseAdmin
    .from('bank_transactions')
    .update({
      matched: true,
      donor_id: donorId,
      category: 'donation'
    })
    .eq('id', transactionId)

  if (matchError) {
    console.error('Error matching transaction:', matchError)
    return { success: false, error: 'Chyba pri aktualizácii statusu transakcie.' }
  }

  // 3. Analyzuj a vlož ju do donations!
  const dDate = new Date(tx.booking_date)
  
  const { error: donationError } = await supabaseAdmin
    .from('donations')
    .insert({
      bank_transaction_id: tx.id,
      donor_id: donorId,
      project_id: projectId || null,
      amount: tx.amount,
      donation_date: tx.booking_date,
      payment_method: 'bank_transfer',
      matched: true
    })

  if (donationError) {
    console.error('Error storing donation record:', donationError)
    // Necháme aspoň zaktualizovanú pôvodnú transakciu
  }

  revalidatePath('/admin/banka')
  return { success: true }
}

/**
 * Funkcia slúžiaca na hromadné / spätné zrušenie párovania
 */
export async function unmatchTransaction(transactionId: string) {
  // 1. Zisti IDcka z donations pre odstránenie analytického záznamu!
  const { error: dError } = await supabaseAdmin
    .from('donations')
    .delete()
    .eq('bank_transaction_id', transactionId)

  // 2. Odober asociáciu z tabulky bank_transactions
  const { error: matchError } = await supabaseAdmin
    .from('bank_transactions')
    .update({
      matched: false,
      donor_id: null,
      category: 'unmatched'
    })
    .eq('id', transactionId)

  if (matchError) {
    return { success: false, error: 'Odpojenie na serveri zlyhalo.' }
  }

  revalidatePath('/admin/banka')
  return { success: true }
}

/**
 * Hromadné spárovanie všetkých nespárovaných kreditných transakcií (podľa aktuálneho filtra)
 * na Anonymného darcu (DARY Donátor).
 */
export async function bulkMatchAnonymous(params: {
  year: number
  month: number | 'all'
}) {
  const donorId = '7aa76574-af94-45c8-b4ce-40b9995c8906'
  
  // 1. Zisti dátumové rozmedzie
  let startDate, endDate
  if (params.month !== 'all') {
    startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`
    const endDateObj = new Date(params.year as number, params.month as number, 0) 
    endDate = `${params.year}-${String(params.month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
  } else {
    startDate = `${params.year}-01-01`
    endDate = `${params.year}-12-31`
  }

  // 2. Nájdite všetky nespárované "credit" transakcie pre dané obdobie
  const { data: txs, error: fetchError } = await supabaseAdmin
    .from('bank_transactions')
    .select('id, amount, booking_date')
    .eq('matched', false)
    .eq('direction', 'credit')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)

  if (fetchError) {
    console.error('Bulk fetch error:', fetchError)
    return { success: false, error: 'Chyba pri hľadaní nespárovaných platieb.' }
  }

  if (!txs || txs.length === 0) {
    return { success: true, count: 0 }
  }

  const txIds = txs.map(t => t.id)

  // 3. Hromadný update bank_transactions
  const { error: updateError } = await supabaseAdmin
    .from('bank_transactions')
    .update({
      matched: true,
      donor_id: donorId,
      category: 'donation'
    })
    .in('id', txIds)

  if (updateError) {
    console.error('Bulk update error:', updateError)
    return { success: false, error: 'Chyba pri hromadnej zmene bankových záznamov.' }
  }

  // 4. Hromadná tvorba záznamov v tabuľke donations
  const donationsToInsert = txs.map(tx => ({
    bank_transaction_id: tx.id,
    donor_id: donorId,
    amount: tx.amount,
    donation_date: tx.booking_date,
    payment_method: 'bank_transfer',
    matched: true
  }))

  const { error: donationError } = await supabaseAdmin
    .from('donations')
    .insert(donationsToInsert)

  if (donationError) {
    console.error('Bulk donations error:', donationError)
  }

  revalidatePath('/admin/banka')
  return { success: true, count: txs.length }
}

/**
 * Získa nespárované platby, pre ktoré systém našiel pravdepodobného darcu.
 * Vykonáva automatickú detekciu duplicitných zhôd (ak sa v DB nachádza viac darcov s rovnakým menom)
 * a analyzuje históriu príspevkov pre zobrazenie informácie o pravidelnosti darcu.
 */
export async function getSuggestedMatches() {
  const { data, error } = await supabaseAdmin
    .rpc('get_suggested_matches')

  if (error) {
    console.error('Error fetching suggested matches:', error)
    return []
  }

  const results = []

  for (const row of (data || [])) {
    let alternativeDonors: any[] = []
    
    // a. Hľadanie podľa presného mena a priezviska (case insensitive)
    if (row.first_name && row.last_name) {
      const { data: nameMatches } = await supabaseAdmin
        .from('donors')
        .select('id, first_name, last_name, variable_symbol, city')
        .ilike('first_name', row.first_name)
        .ilike('last_name', row.last_name)
        
      if (nameMatches && nameMatches.length > 0) {
        alternativeDonors = [...alternativeDonors, ...nameMatches]
      }
    }
    
    // b. Hľadanie podľa variabilného symbolu
    if (row.variable_symbol && row.variable_symbol !== 'NOTPROVIDED' && row.variable_symbol !== '') {
      const cleanVs = row.variable_symbol.replace(/^0+/, '')
      const { data: vsMatches } = await supabaseAdmin
        .from('donors')
        .select('id, first_name, last_name, variable_symbol, city')
        .or(`variable_symbol.eq.${row.variable_symbol},variable_symbol.eq.${cleanVs}`)
        
      if (vsMatches && vsMatches.length > 0) {
        alternativeDonors = [...alternativeDonors, ...vsMatches]
      }
    }

    // c. Hľadanie podľa IBANu
    if (row.counterparty_iban) {
      const cleanIban = row.counterparty_iban.replace(/\s+/g, '')
      const { data: ibanMatches } = await supabaseAdmin
        .from('donors')
        .select('id, first_name, last_name, variable_symbol, city')
        .ilike('iban', `%${cleanIban}%`)
        
      if (ibanMatches && ibanMatches.length > 0) {
        alternativeDonors = [...alternativeDonors, ...ibanMatches]
      }
    }

    // d. Hľadanie podľa priezviska v názve protiúčtu (ak existuje)
    if (row.counterparty_name) {
      const words = row.counterparty_name.split(/\s+/).filter((w: string) => w.length > 2)
      for (const word of words) {
        const { data: wordMatches } = await supabaseAdmin
          .from('donors')
          .select('id, first_name, last_name, variable_symbol, city')
          .ilike('last_name', `%${word}%`)
          
        if (wordMatches && wordMatches.length > 0) {
          const validMatches = wordMatches.filter(d => {
            const cleanName = row.counterparty_name.toLowerCase()
            const cleanFirst = d.first_name.toLowerCase()
            return cleanName.includes(cleanFirst)
          })
          alternativeDonors = [...alternativeDonors, ...validMatches]
        }
      }
    }

    // Odstránime duplicity zo zoznamu alternatívnych darcov
    const uniqueAlternativesMap = new Map<string, any>()
    alternativeDonors.forEach(d => {
      uniqueAlternativesMap.set(d.id, d)
    })
    
    // Ak by z nejakého dôvodu primárny navrhnutý darca chýbal v zozname, pridáme ho
    if (row.donor_id && !uniqueAlternativesMap.has(row.donor_id)) {
      uniqueAlternativesMap.set(row.donor_id, {
        id: row.donor_id,
        first_name: row.first_name,
        last_name: row.last_name,
        variable_symbol: row.donor_variable_symbol,
        city: row.city
      })
    }
    
    const uniqueAlternatives = Array.from(uniqueAlternativesMap.values())

    // Zistíme históriu darov pre každého kandidáta pre zistenie pravidelnosti
    const enrichedAlternatives = []
    
    for (const donor of uniqueAlternatives) {
      const { data: history } = await supabaseAdmin
        .from('donations')
        .select('amount, donation_date')
        .eq('donor_id', donor.id)
        .order('donation_date', { ascending: false })
        .limit(10)
        
      let regularityHint = ''
      if (history && history.length > 0) {
        const donationCount = history.length
        const amounts = history.map(h => Number(h.amount))
        const averageAmount = amounts.reduce((a, b) => a + b, 0) / donationCount
        
        const days = history.map(h => new Date(h.donation_date).getDate())
        const uniqueDays = [...new Set(days)]
        
        // Detekcia pravidelnosti darov (mesačná)
        const dates = history.map(h => new Date(h.donation_date).getTime())
        let isMonthly = false
        if (dates.length >= 2) {
          const diffs = []
          for (let i = 0; i < dates.length - 1; i++) {
            diffs.push((dates[i] - dates[i+1]) / (1000 * 60 * 60 * 24))
          }
          const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
          if (avgDiff >= 25 && avgDiff <= 35) {
            isMonthly = true
          }
        }

        if (isMonthly) {
          const avgDay = Math.round(uniqueDays.reduce((a, b) => a + b, 0) / uniqueDays.length)
          regularityHint = `Pravidelný mesačný darca (priemerne ${averageAmount.toFixed(2)} € okolo ${avgDay}. dňa)`
        } else if (donationCount >= 3) {
          regularityHint = `Opakovaný darca (${donationCount} darov, priemerne ${averageAmount.toFixed(2)} €)`
        } else {
          regularityHint = `Príležitostný darca (${donationCount} darov)`
        }
      } else {
        regularityHint = 'Nový darca (bez doterajšej histórie príspevkov)'
      }

      enrichedAlternatives.push({
        ...donor,
        regularityHint,
        donationHistoryCount: history?.length || 0
      })
    }

    // Zoradíme kandidátov: primárny navrhnutý darca bude na prvom mieste
    enrichedAlternatives.sort((a, b) => {
      if (a.id === row.donor_id) return -1
      if (b.id === row.donor_id) return 1
      return b.donationHistoryCount - a.donationHistoryCount
    })

    results.push({
      transaction: {
        id: row.transaction_id,
        booking_date: row.booking_date,
        counterparty_name: row.counterparty_name,
        counterparty_iban: row.counterparty_iban,
        amount: row.amount,
        variable_symbol: row.variable_symbol,
        remittance_info: row.remittance_info,
      },
      suggestedDonor: enrichedAlternatives[0] || {
        id: row.donor_id,
        first_name: row.first_name,
        last_name: row.last_name,
        variable_symbol: row.donor_variable_symbol,
        city: row.city,
        regularityHint: 'Nový darca',
        donationHistoryCount: 0
      },
      allCandidates: enrichedAlternatives,
      hasMultipleMatches: enrichedAlternatives.length > 1,
      reason: row.match_reason,
      confidence: row.match_confidence,
    })
  }

  return results
}

/**
 * Hromadne spáruje zoznam navrhnutých platieb.
 */
export async function bulkMatchSuggested(matches: {
  transactionId: string
  donorId: string
  amount: number
  bookingDate: string
}[]) {
  if (!matches || matches.length === 0) {
    return { success: true, count: 0 }
  }

  try {
    // 1. Aktualizujeme statusy transakcií v bank_transactions
    const updatePromises = matches.map((m) =>
      supabaseAdmin
        .from('bank_transactions')
        .update({
          matched: true,
          donor_id: m.donorId,
          category: 'donation'
        })
        .eq('id', m.transactionId)
    )
    
    const updateResults = await Promise.all(updatePromises)
    const updateErrors = updateResults.filter(r => r.error)
    if (updateErrors.length > 0) {
      console.error('Some updates failed in bulkMatchSuggested:', updateErrors)
    }

    // 2. Vložíme dary do tabuľky donations
    const donationsToInsert = matches.map((m) => ({
      bank_transaction_id: m.transactionId,
      donor_id: m.donorId,
      amount: m.amount,
      donation_date: m.bookingDate,
      payment_method: 'bank_transfer',
      matched: true
    }))

    const { error: insertError } = await supabaseAdmin
      .from('donations')
      .insert(donationsToInsert)

    if (insertError) {
      console.error('Error inserting donations in bulkMatchSuggested:', insertError)
      return { success: false, error: 'Chyba pri zápise spárovaných darov.' }
    }

    revalidatePath('/admin/banka')
    return { success: true, count: matches.length }
  } catch (err: any) {
    console.error('Exception in bulkMatchSuggested:', err)
    return { success: false, error: err.message || 'Neočakávaná chyba pri hromadnom párovaní.' }
  }
}

/**
 * Pomocné funkcie pre bezpečné parsovanie stiahnutých stĺpcov z Fio JSON API.
 * Ošetrujú prípad, kedy banka vráti polia ako objekt { value } alebo ako primitívnu hodnotu, prípadne null.
 */
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

/**
 * Synchronizuje transakcie z Fio banky cez REST API za posledných 30 dní.
 */
export async function syncFioTransactions() {
  const token = process.env.FIO_API_TOKEN
  if (!token) {
    return { 
      success: false, 
      error: 'V konfigurácii servera (.env.local) chýba FIO_API_TOKEN. Prepojenie na banku nie je nastavené.' 
    }
  }

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
      next: { revalidate: 0 } // vypnúť caching v Next.js
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

      if (direction === 'credit' && vs) {
        if (donorVsMap.has(vs)) {
          matchedDonorId = donorVsMap.get(vs)
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
          const pId = tx.specific_symbol && projectSsMap.has(tx.specific_symbol) ? projectSsMap.get(tx.specific_symbol) : null

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
    return { success: false, error: err.message || 'Neočakávaná chyba počas bankovej synchronizácie.' }
  }
}


