'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCurrentDonor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const userEmail = user.email?.trim().toLowerCase()
  if (!userEmail) return null

  // 1. Vytvoriť admin klienta na prepojenie profilu (obídenie RLS pred prvým prepojením)
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Skontrolovať, či už existuje darca s rovnakým e-mailom
  const { data: existingDonor, error: donorFetchError } = await supabaseAdmin
    .from('donors')
    .select('id, auth_user_id')
    .ilike('email', userEmail)
    .maybeSingle()

  if (existingDonor) {
    // Ak darca existuje, ale nemá ešte priradené auth_user_id, prepojíme ho!
    if (!existingDonor.auth_user_id) {
      const { error: updateError } = await supabaseAdmin
        .from('donors')
        .update({ auth_user_id: user.id })
        .eq('id', existingDonor.id)

      if (updateError) {
        console.error('[getCurrentDonor] Zlyhalo priradenie auth_user_id:', updateError)
      } else {
        console.log(`[getCurrentDonor] Úspešne prepojený darca ${existingDonor.id} s auth_user_id ${user.id}`)
      }
    }
  } else {
    // Ak darca vôbec neexistuje v tabuľke public.donors, automaticky ho vytvoríme (napr. pre novoprihlásených cez Google)
    const name = user.user_metadata?.full_name || userEmail.split('@')[0]
    const parts = name.split(' ')
    const firstName = parts[0] || 'Žiadateľ'
    const lastName = parts.slice(1).join(' ') || 'KROK'

    // Získať ďalšie VS pre tohto darcu
    const { data: vsData } = await supabaseAdmin
      .from('donors')
      .select('variable_symbol')
      .not('variable_symbol', 'is', null)

    const maxVS = (vsData || []).reduce((max, d) => {
      const num = parseInt(d.variable_symbol || '0')
      return num > max ? num : max
    }, 11771451)
    const vs = (maxVS + 1).toString()

    const { error: createError } = await supabaseAdmin
      .from('donors')
      .insert({
        auth_user_id: user.id,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        variable_symbol: vs,
        donor_type: 'individual',
        status: 'active',
        registered_at: new Date().toISOString()
      })

    if (createError) {
      console.error('[getCurrentDonor] Zlyhalo vytvorenie nového profilu pre darcu:', createError)
    } else {
      console.log(`[getCurrentDonor] Úspešne vytvorený nový profil darcu pre ${userEmail}`)
    }
  }

  // 3. Načítať darcu cez štandardný klientský supabase (RLS už prepustí dopyt, lebo auth_user_id = user.id)
  const { data: donor, error } = await supabase
    .from('donors')
    .select(`
      *,
      parishes (
        id,
        name
      )
    `)
    .eq('email', userEmail)
    .single()

  if (error) {
    console.error('Error fetching donor after sync:', error)
    return null
  }

  return donor
}

export async function updateProfile(data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Neprihlásený používateľ' }

  const { error } = await supabase
    .from('donors')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      street: data.street,
      city: data.city,
      postal_code: data.postal_code,
      updated_at: new Date().toISOString()
    })
    .eq('email', user.email)

  if (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Nepodarilo sa uložiť zmeny.' }
  }

  revalidatePath('/profil')
  return { success: true }
}

export async function getDonorDonations(donorId: string) {
  const supabase = await createClient()
  
  const { data: donations, error } = await supabase
    .from('donations')
    .select(`
      *,
      projects (
        name
      )
    `)
    .eq('donor_id', donorId)
    .order('donation_date', { ascending: false })

  if (error) {
    console.error('Error fetching donations:', error)
    return []
  }

  return donations
}
