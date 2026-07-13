import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { XMLParser } from 'fast-xml-parser'
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Autorizácia: iba používateľ s oprávnením import_bank (middleware /api/* nechráni!)
    try {
      await requirePermission('import_bank')
    } catch (authErr) {
      if (authErr instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Neprihlásený používateľ.' }, { status: 401 })
      }
      if (authErr instanceof ForbiddenError) {
        return NextResponse.json({ error: 'Nemáte oprávnenie na import.' }, { status: 403 })
      }
      throw authErr
    }

    // Používame admin klienta (Service Role), aby sme plynulo obišli RLS pre Storage bucket 'banka'
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nebol poskytnutý žiadny súbor.' }, { status: 400 })
    }

    let xmlContent = await file.text()
    
    // Odstránenie UTF-8 BOM (Byte Order Mark) a bielych znakov na začiatku/konci
    xmlContent = xmlContent.trim().replace(/^\uFEFF/, '')
    
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

    // 4. Extract Statement Info (handle single Stmt object or array of Stmt objects)
    const statements = Array.isArray(statementRoot.Stmt)
      ? statementRoot.Stmt
      : (statementRoot.Stmt ? [statementRoot.Stmt] : [])

    const accountIban = statements[0]?.Acct?.Id?.IBAN || 'Neznámy IBAN'

    const entries: any[] = []
    for (const stmt of statements) {
      const Ntry = stmt?.Ntry
      const stmtEntries = Array.isArray(Ntry) ? Ntry : (Ntry ? [Ntry] : [])
      entries.push(...stmtEntries)
    }

    // Find min and max dates from entries for batch periods
    let periodFrom: string | null = null
    let periodTo: string | null = null

    const parsedDates = entries.map((entry: any) => {
      const dateRaw = entry.BookgDt?.Dt || entry.ValDt?.Dt
      return dateRaw ? String(dateRaw).substring(0, 10) : null
    }).filter(Boolean) as string[]

    if (parsedDates.length > 0) {
      parsedDates.sort()
      periodFrom = parsedDates[0]
      periodTo = parsedDates[parsedDates.length - 1]
    }

    // Prepare Batch
    const { data: batch, error: batchError } = await supabase
      .from('bank_import_batches')
      .insert({
        filename: storageFileName, // Ukladáme premenovaný súbor, pod ktorým je v buckete
        iban: accountIban,
        total_entries: entries.length,
        period_from: periodFrom,
        period_to: periodTo,
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

    // 6a. Deduplicate transactions by entry_ref to prevent duplicate key constraint violations
    let newTxsToInsert = [...txToInsert]
    let skippedCount = 0

    if (txToInsert.length > 0) {
      const entryRefs = txToInsert.map(tx => tx.entry_ref)
      const { data: existingTxs, error: fetchTxsError } = await supabase
        .from('bank_transactions')
        .select('entry_ref')
        .in('entry_ref', entryRefs)

      if (fetchTxsError) {
        console.warn('Nepodarilo sa overiť existujúce transakcie:', fetchTxsError)
      } else if (existingTxs) {
        const existingRefsSet = new Set(existingTxs.map(tx => tx.entry_ref))
        newTxsToInsert = txToInsert.filter(tx => !existingRefsSet.has(tx.entry_ref))
        skippedCount = txToInsert.length - newTxsToInsert.length
      }
    }

    // Insert only NEW to DB and get back the records to extract IDs for donations
    let insertedTxs: any[] = []
    if (newTxsToInsert.length > 0) {
      const { data, error: insertError } = await supabase
        .from('bank_transactions')
        .insert(newTxsToInsert)
        .select()

      if (insertError) {
        console.error('Insert Error:', insertError)
        return NextResponse.json({ 
          error: 'Vyskytla sa chyba pri zápise transakcií do databázy.',
          details: insertError.message 
        }, { status: 500 })
      }
      insertedTxs = data || []
    }

    // Recalculate matched count only for newly imported transactions
    const newMatchedCount = newTxsToInsert.filter(tx => tx.donor_id !== null).length

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
      imported: newTxsToInsert.length,
      skipped: skippedCount,
      matched: newMatchedCount,
      errors: 0
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Kritická chyba pri analýze XML súboru.' }, { status: 500 })
  }
}
