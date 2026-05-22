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
  const { data, error } = await supabaseAdmin
    .from('bank_import_batches')
    .select('period_from, period_to')

  if (error || !data) return [new Date().getFullYear()]

  const years = new Set<number>()
  data.forEach((batch) => {
    if (batch.period_from) years.add(new Date(batch.period_from).getFullYear())
    if (batch.period_to) years.add(new Date(batch.period_to).getFullYear())
  })

  // Fallback ak nemáme zatiaľ importy
  if (years.size === 0) years.add(new Date().getFullYear())

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

  const { data, error } = await supabaseAdmin
    .from('donors')
    .select('id, first_name, last_name, email, variable_symbol, city')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,variable_symbol.ilike.%${query}%`)
    .limit(20)

  if (error) {
    console.error('Error searching donors:', error)
    return []
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
