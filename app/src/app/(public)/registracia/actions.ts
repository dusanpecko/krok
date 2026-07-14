'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

// Privileged admin client to bypass INSERT RLS restriction for anonymous visitor
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Feches options lists for parishes and active projects
 */
export async function getRegistrationFormOptions() {
  // Use privileged admin client to bypass RLS restrictions for public anonymous visitor
  // since parishes and projects tables might restrict read access for anonymous clients

  // 1. Fetch all parishes ordered by name
  const { data: parishes, error: parishesError } = await supabaseAdmin
    .from('parishes')
    .select('id, name')
    .order('name')

  if (parishesError) {
    console.error('Error fetching parishes:', {
      message: parishesError.message,
      code: parishesError.code,
      details: parishesError.details,
      hint: parishesError.hint
    })
  }

  // 2. Fetch active projects ordered by name
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .eq('visible_on_web', true)
    .order('name')

  if (projectsError) {
    console.error('Error fetching projects:', {
      message: projectsError.message,
      code: projectsError.code,
      details: projectsError.details,
      hint: projectsError.hint
    })
  }

  return {
    parishes: parishes || [],
    projects: projects || [],
  }
}

/**
 * Generates the next unique Variable Symbol using admin client.
 * INTERNÉ – nie je exportované (predtým verejne volateľná akcia unikala ďalší VS).
 */
async function generateNextVSAdmin() {
  // Find the highest numeric VS
  const { data, error } = await supabaseAdmin
    .from('donors')
    .select('variable_symbol')
    .not('variable_symbol', 'is', null)

  if (error) {
    console.error('Error fetching VS:', error)
    return '11771452' // Fallback
  }

  const maxVS = data.reduce((max, d) => {
    const num = parseInt(d.variable_symbol || '0')
    return num > max ? num : max
  }, 11771451)

  return (maxVS + 1).toString()
}

/**
 * Registers a new donor and logs them into database tables
 */
export async function registerDonor(data: any) {
  try {
    // 0. Rate-limit podľa IP (ochrana proti hromadnej registrácii a enumerácii e-mailov)
    const { success: withinLimit } = await checkRateLimit('register', {
      limit: 5,
      window: '1 h',
    })
    if (!withinLimit) {
      return {
        success: false,
        error: 'Priveľa pokusov o registráciu. Skúste to prosím neskôr (o hodinu).',
        code: 'RATE_LIMITED',
      }
    }

    // 1. Check if donor with this email already exists
    const emailToUse = data.email?.trim().toLowerCase()
    if (emailToUse) {
      const { data: existingDonor, error: checkError } = await supabaseAdmin
        .from('donors')
        .select('id, email, variable_symbol')
        .eq('email', emailToUse)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing donor:', checkError)
      }

      if (existingDonor) {
        return {
          success: false,
          error: 'Darca s týmto e-mailom je už zaregistrovaný. Prihláste sa prosím do svojej darcovskej zóny.',
          code: 'EMAIL_EXISTS',
        }
      }
    }

    // 2. Generate the next unique Variable Symbol
    const vs = await generateNextVSAdmin()

    // 3. Format structured notes to preserve donation program details without database changes
    let formattedNotes = `Zvolený donátorský program: ${data.donation_program}`
    if (data.donation_program === 'Čiastku si volím sám' && data.custom_amount) {
      formattedNotes += ` (${data.custom_amount} € mesačne)`
    }
    if (data.notes && data.notes.trim()) {
      formattedNotes += `\n\nPoznámka od darcu:\n${data.notes.trim()}`
    }

    // 4. Construct payload for the donors table
    const isCompany = data.donor_type === 'organization'
    const donorPayload = {
      first_name: data.first_name?.trim(),
      last_name: data.last_name?.trim(),
      email: emailToUse || null,
      phone: data.phone?.trim() || null,
      street: data.street?.trim() || null,
      city: data.city?.trim(),
      postal_code: data.postal_code?.trim() || null,
      parish_id: data.parish_id || null,
      donor_type: isCompany ? 'organization' : 'individual',
      status: 'active',
      notes: formattedNotes,
      registered_at: new Date().toISOString(),
      variable_symbol: vs,
      newsletter_opt_in: data.newsletter_opt_in === 'áno',
      confirmation_method: data.confirmation_method === 'Poštou' ? 'post' : 'email',
      company_name: isCompany ? data.company_name?.trim() : null,
      ico: isCompany ? data.ico?.trim() : null,
      dic: isCompany ? data.dic?.trim() : null,
    }

    // 5. Insert new donor
    const { data: newDonor, error: insertError } = await supabaseAdmin
      .from('donors')
      .insert([donorPayload])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting donor:', insertError)
      return { success: false, error: 'Nepodarilo sa zaregistrovať darcu. Skontrolujte prosím zadané údaje.' }
    }

    // 6. Link to supported project if selected
    if (data.project_id && newDonor) {
      const { error: projectLinkError } = await supabaseAdmin
        .from('donor_projects')
        .insert([{
          donor_id: newDonor.id,
          project_id: data.project_id
        }])

      if (projectLinkError) {
        console.error('Error linking project to donor:', projectLinkError)
        // We do not fail the whole request because the donor is already registered successfully
      }
    }

    return {
      success: true,
      donor: {
        id: newDonor.id,
        first_name: newDonor.first_name,
        last_name: newDonor.last_name,
        variable_symbol: newDonor.variable_symbol,
        email: newDonor.email
      }
    }

  } catch (err) {
    console.error('Unexpected registration error:', err)
    return { success: false, error: 'Vyskytla sa neočakávaná chyba. Skúste to prosím neskôr.' }
  }
}
