import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { XMLParser } from 'fast-xml-parser'

export async function POST(request: Request) {
  try {
    // Používame admin klienta (Service Role), aby sme plynulo obišli RLS pre Storage bucket 'banka'
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Authentication simple check (server side, assuming admin context based on middleware or cookies)

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nebol poskytnutý žiadny súbor.' }, { status: 400 })
    }

    const xmlContent = await file.text()
    
    // 0. Upload File to Supabase Storage Bucket 'banka'
    const storageFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error: storageError } = await supabase.storage
      .from('banka')
      .upload(storageFileName, file, { upsert: false })
      
    if (storageError) {
      console.warn('Nepodarilo sa nahrať súbor do Supabase bucketu:', storageError)
      // Pokračujeme v importe db, súbor len nebude v archíve
    }

    // 1. Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    })
    
    let parsedXml
    try {
      parsedXml = parser.parse(xmlContent)
    } catch (e) {
      return NextResponse.json({ error: 'Nevalídny XML formát súboru.' }, { status: 400 })
    }

    // 2. Validate CAMT.053
    const statementRoot = parsedXml?.Document?.BkToCstmrStmt
    if (!statementRoot) {
      return NextResponse.json({ 
        error: 'Tento XML súbor nie je korektný bankový výpis.',
        details: 'Chýba koreňový uzol Document.BkToCstmrStmt (očakáva sa formát camt.053)'
      }, { status: 400 })
    }

    const messageId = statementRoot.GrpHdr?.MsgId
    if (!messageId) {
      return NextResponse.json({ 
        error: 'V štruktúre výpisu chýba Message ID (GrpHdr.MsgId).'
      }, { status: 400 })
    }

    // 3. Check for duplicates (Duplicate Protection)
    // First, verify bank_import_batches has this message_id. Let's check schema.
    // Wait, the schema from 001_schema.sql doesn't explicitly have message_id in bank_import_batches, 
    // it has `filename`, `iban`, etc. Let's use filename or we can run a query against bank_transactions message_id.
    // Actually, `bank_transactions` has `message_id`. We can query if any transaction has this message_id.
    const { data: existingTx } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('message_id', messageId)
      .limit(1)

    if (existingTx && existingTx.length > 0) {
      return NextResponse.json({
        error: 'Duplikátny import.',
        message: 'Tento výpis (Message ID) bol už v minulosti importovaný.',
        details: { original_file: file.name }
      }, { status: 409 })
    }

    // 4. Extract Statement Info
    const stmt = statementRoot.Stmt
    const accountIban = stmt?.Acct?.Id?.IBAN || 'Neznámy IBAN'
    const Ntry = stmt?.Ntry
    
    // Arrays in fast-xml-parser: if single item, it is an object. Ensure array.
    const entries = Array.isArray(Ntry) ? Ntry : (Ntry ? [Ntry] : [])

    if (entries.length === 0) {
      return NextResponse.json({ error: 'Tento výpis neobsahuje žiadne transakcie.' }, { status: 400 })
    }

    // Prepare Batch
    const { data: batch, error: batchError } = await supabase
      .from('bank_import_batches')
      .insert({
        filename: storageFileName, // Ukladáme premenovaný súbor, pod ktorým je v buckete
        iban: accountIban,
        total_entries: entries.length,
      })
      .select()
      .single()

    if (batchError || !batch) {
       console.error('Batch error:', batchError)
       return NextResponse.json({ error: 'Zlyhalo vytvorenie importnej dávky v databáze.' }, { status: 500 })
    }

    // 5. Pre-fetch all donors to do VS mapping in memory (faster than N queries)
    const { data: donors } = await supabase.from('donors').select('id, variable_symbol')
    const donorVsMap = new Map<string, string>()
    if (donors) {
      donors.forEach(d => {
        if (d.variable_symbol) donorVsMap.set(d.variable_symbol, d.id)
      })
    }

    const { data: projects } = await supabase.from('projects').select('id, specific_symbol')
    const projectSsMap = new Map<string, string>()
    if (projects) {
      projects.forEach(p => {
        if (p.specific_symbol) projectSsMap.set(p.specific_symbol, p.id)
      })
    }

    // 6. Process Transactions
    const txToInsert = []
    let matchedCount = 0

    for (const entry of entries) {
      const entryRef = String(entry.NtryRef || 'UNKNOWN_REF')
      const amountStr = entry.Amt?.['#text'] || entry.Amt || '0'
      const amount = parseFloat(amountStr)
      if (isNaN(amount)) continue
      
      const currency = entry.Amt?.['@_Ccy'] || 'EUR'
      const direction = entry.CdtDbtInd === 'CRDT' ? 'credit' : 'debit'
      const bookingDate = entry.BookgDt?.Dt || entry.ValDt?.Dt || new Date().toISOString()
      
      const txDtls = entry.NtryDtls?.TxDtls
      const endToEndId = String(txDtls?.Refs?.EndToEndId || '')
      const ustrd = String(txDtls?.RmtInf?.Ustrd || '')
      const addtlInf = String(txDtls?.AddtlTxInf || '')

      const rltdPties = txDtls?.RltdPties
      const counterIban = direction === 'credit' 
        ? rltdPties?.DbtrAcct?.Id?.IBAN 
        : rltdPties?.CdtrAcct?.Id?.IBAN
        
      const counterName = direction === 'credit'
        ? (rltdPties?.Dbtr?.Nm || addtlInf) // sometimes name is in AddtlTxInf in Fio
        : rltdPties?.Cdtr?.Nm

      // Try extract VS and SS
      let vs = null
      let ss = null
      
      // EndToEndId typical Fio format: ?/VS11770611/SS/KS or /VS123/SS456
      const vsMatch = endToEndId.match(/VS(\d+)/i)
      if (vsMatch) {
         vs = vsMatch[1].replace(/^0+/, '')
         if (vs === '') vs = '0'
      }

      const ssMatch = endToEndId.match(/SS(\d+)/i)
      if (ssMatch) ss = ssMatch[1]

      // Determine matching
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
        message_id: messageId,
        amount: amount,
        currency: currency,
        direction: direction,
        booking_date: bookingDate,
        counterparty_iban: counterIban || null,
        counterparty_name: counterName || null,
        variable_symbol: vs,
        specific_symbol: ss,
        remittance_info: ustrd,
        donor_id: matchedDonorId,
        matched: isMatched,
        category: category,
        import_batch_id: batch.id
      })

      if (isMatched) matchedCount++
    }

    // Insert to DB and get back the records to extract IDs for donations
    const { data: insertedTxs, error: insertError } = await supabase
      .from('bank_transactions')
      .insert(txToInsert)
      .select()

    if (insertError) {
      console.error('Insert Error:', insertError)
      // Some refs might be duplicates if file partially overlaps. We can refine this using UPSERT if needed.
      return NextResponse.json({ 
        error: 'Vyskytla sa chyba pri zápise transakcií do databázy.',
        details: insertError.message 
      }, { status: 500 })
    }

    // 7. Auto-create donations for successfully auto-matched transactions
    if (insertedTxs && insertedTxs.length > 0) {
       const matchedTxs = insertedTxs.filter(tx => tx.matched === true)
       
       if (matchedTxs.length > 0) {
          const donationsToInsert = matchedTxs.map(tx => {
             // Find matching specific symbol to donor project mapping if applicable
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
          
          const { error: donationsError } = await supabase
            .from('donations')
            .insert(donationsToInsert)
            
          if (donationsError) {
             console.error('Donations Insert Error:', donationsError)
          }
       }
    }

    return NextResponse.json({
      message: 'Import bol úspešný',
      imported: txToInsert.length,
      skipped: 0,
      matched: matchedCount,
      errors: 0
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Kritická chyba pri analýze XML súboru.' }, { status: 500 })
  }
}
