'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { sanitizeSearchTerm, sanitizeFilterValue } from '@/lib/search'
import { runFioSync } from '@/lib/bank/fio-sync'
import { MOLLIE_PAYOUT_CATEGORY } from '@/lib/bank/mollie-payout'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Získa zoznam unikátnych rokov z importovaných dávok.
 */
export async function getBankYears() {
  await requirePermission('view_bank')
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
  /** Smer pohybu: príjmy (credit), výdaje (debit) alebo všetko */
  direction?: 'all' | 'credit' | 'debit'
  search: string
  page: number
}) {
  await requirePermission('view_bank')
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
    // Výplaty z Mollie nie sú „na spárovanie" – dary sú už zaznamenané online
    query = query.eq('matched', false).neq('category', MOLLIE_PAYOUT_CATEGORY)
  }

  // 2b. Smer pohybu
  if (params.direction === 'credit' || params.direction === 'debit') {
    query = query.eq('direction', params.direction)
  }

  // 3. Search
  if (params.search && params.search.length > 2) {
    const s = sanitizeSearchTerm(params.search)
    if (s) {
      query = query.or(`counterparty_name.ilike.%${s}%,counterparty_iban.ilike.%${s}%,variable_symbol.ilike.%${s}%,remittance_info.ilike.%${s}%`)
    }
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
  await requirePermission('view_bank')
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
      .or(`first_name.ilike.%${sanitizeSearchTerm(query)}%,last_name.ilike.%${sanitizeSearchTerm(query)}%,variable_symbol.ilike.%${sanitizeSearchTerm(query)}%`)
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
  await requirePermission('view_bank')
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
  await requirePermission('view_bank')
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

  if (tx.category === MOLLIE_PAYOUT_CATEGORY) {
    return {
      success: false,
      error: 'Toto je výplata z Mollie (hromadný prevod online darov). Dary sú už zaznamenané cez online platby – párovanie by ich započítalo dvakrát.',
    }
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
  await requirePermission('view_bank')
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
  await requirePermission('view_bank')
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
    .neq('category', MOLLIE_PAYOUT_CATEGORY) // výplaty z Mollie sa nepárujú
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
  await requirePermission('view_bank')
  const { data, error } = await supabaseAdmin
    .rpc('get_suggested_matches')

  if (error) {
    console.error('Error fetching suggested matches:', error)
    return []
  }

  const results = []

  // Výplaty z Mollie sa nenavrhujú na párovanie (dary sú už v donations)
  const rowIds = (data || []).map((r: { transaction_id: string }) => r.transaction_id)
  const payoutIds = new Set<string>()
  if (rowIds.length > 0) {
    const { data: payoutRows } = await supabaseAdmin
      .from('bank_transactions')
      .select('id')
      .in('id', rowIds)
      .eq('category', MOLLIE_PAYOUT_CATEGORY)
    for (const r of payoutRows ?? []) payoutIds.add(r.id)
  }

  for (const row of (data || [])) {
    if (payoutIds.has(row.transaction_id)) continue
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
      const rawVs = sanitizeFilterValue(row.variable_symbol)
      const cleanVs = rawVs.replace(/^0+/, '')
      const { data: vsMatches } = await supabaseAdmin
        .from('donors')
        .select('id, first_name, last_name, variable_symbol, city')
        .or(`variable_symbol.eq.${rawVs},variable_symbol.eq.${cleanVs}`)
        
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
  await requirePermission('view_bank')
  if (!matches || matches.length === 0) {
    return { success: true, count: 0 }
  }

  // Výplaty z Mollie sa nikdy nepárujú (dary sú už v donations cez online platby)
  const { data: payoutRows } = await supabaseAdmin
    .from('bank_transactions')
    .select('id')
    .in('id', matches.map((m) => m.transactionId))
    .eq('category', MOLLIE_PAYOUT_CATEGORY)
  const payoutIds = new Set((payoutRows ?? []).map((r) => r.id))
  matches = matches.filter((m) => !payoutIds.has(m.transactionId))
  if (matches.length === 0) {
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
/**
 * Synchronizuje transakcie z Fio banky cez REST API za posledných 30 dní.
 * Implementácia je v `lib/bank/fio-sync.ts` (zdieľaná s cronom).
 */
export async function syncFioTransactions() {
  await requirePermission('view_bank')
  return runFioSync()
}


