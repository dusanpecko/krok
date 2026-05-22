import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { XMLParser } from 'fast-xml-parser'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// FileMaker XML Field Indices based on METADATA analysis:
const COLS = {
  AKTIVNY: 0,
  EMAIL: 3,
  FARNOST: 4,
  FIRMA: 5,
  ID_DONATOR: 6,
  MENO: 7,
  MESTO: 8,
  MOBIL: 9,
  PRIEZVISKO: 11,
  PROJEKT: 12, // Optional: might be useful
  REG_DATE: 15,
  K_ADRESA: 21,
  K_MESTO: 22,
  K_PSC: 23,
  ULICA: 35,
  PSC: 33
}

async function runMigration() {
  const xmlPath = path.resolve(__dirname, '../../data/donator.xml')
  console.log('Reading XML from:', xmlPath)
  
  if (!fs.existsSync(xmlPath)) {
    console.error('Error: donator.xml not found!')
    return
  }

  const xmlData = fs.readFileSync(xmlPath, 'utf-8')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    unpairedTags: ["hr", "br", "link", "meta"]
  })
  
  const jsonObj = parser.parse(xmlData)
  const rows = jsonObj.FMPXMLRESULT.RESULTSET.ROW
  console.log(`Found ${rows.length} rows in XML.`)

  // Cache parishes to avoid redundant DB queries
  const { data: existingParishes } = await supabase.from('parishes').select('id, name')
  const parishMap = new Map<string, string>()
  existingParishes?.forEach(p => parishMap.set(p.name.toLowerCase().trim(), p.id))

  const donorsToUpsert: any[] = []

  for (const row of rows) {
    const cols = row.COL
    
    // Helper to get data from COL
    const getData = (index: number) => {
      const col = cols[index]
      if (!col || !col.DATA) return null
      return String(col.DATA).trim()
    }

    const firstName = getData(COLS.MENO)
    const lastName = getData(COLS.PRIEZVISKO)
    
    if (!firstName || !lastName) {
      console.warn('Skipping row without name:', row['@_RECORDID'])
      continue
    }

    // Resolve Parish
    let parishName = getData(COLS.FARNOST) || 'Bez farnosti'
    let parishId = parishMap.get(parishName.toLowerCase().trim())

    if (parishName !== 'Bez farnosti' && !parishId) {
      console.log(`Creating new parish: ${parishName}`)
      const { data: newParish, error: pError } = await supabase
        .from('parishes')
        .insert({ name: parishName })
        .select()
        .single()
      
      if (newParish) {
        parishId = newParish.id
        parishMap.set(parishName.toLowerCase().trim(), parishId as string)
      } else {
        console.error('Failed to create parish:', parishName, pError)
      }
    }

    // Map address
    const street = getData(COLS.K_ADRESA) || getData(COLS.ULICA)
    const city = getData(COLS.K_MESTO) || getData(COLS.MESTO)
    const psc = getData(COLS.K_PSC) || getData(COLS.PSC)
    
    // Parse Registration Date (D.m.yyyy)
    let registeredAt = null
    const regDateStr = getData(COLS.REG_DATE)
    if (regDateStr) {
      const [d, m, y] = regDateStr.split('.')
      if (d && m && y) {
        registeredAt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toISOString()
      }
    }

    const donorType = getData(COLS.FIRMA) ? 'organization' : 'individual'
    const status = getData(COLS.AKTIVNY) === '1' ? 'active' : 'inactive'
    const legacyId = getData(COLS.ID_DONATOR)

    donorsToUpsert.push({
      legacy_id: legacyId,
      variable_symbol: legacyId, // Assuming ID_donator is the VS
      first_name: firstName,
      last_name: lastName,
      email: getData(COLS.EMAIL),
      phone: getData(COLS.MOBIL),
      street: street,
      city: city,
      postal_code: psc,
      parish_id: parishId,
      donor_type: donorType,
      status: status,
      registered_at: registeredAt,
      notes: getData(COLS.FIRMA) ? `Firma: ${getData(COLS.FIRMA)}` : null
    })
  }

  console.log(`Preparing to upsert ${donorsToUpsert.length} donors...`)

  // Batch upsert (Supabase handles batching automatically in .upsert([]))
  const { error: upsertError } = await supabase
    .from('donors')
    .upsert(donorsToUpsert, { onConflict: 'variable_symbol' })

  if (upsertError) {
    console.error('Error during upsert:', upsertError)
  } else {
    console.log('Successfully migrated all donors! 🎉')
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err)
})
