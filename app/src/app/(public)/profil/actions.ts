'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCurrentDonor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: donor, error } = await supabase
    .from('donors')
    .select(`
      *,
      parishes (
        id,
        name
      )
    `)
    .eq('email', user.email)
    .single()

  if (error) {
    console.error('Error fetching donor:', error)
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
