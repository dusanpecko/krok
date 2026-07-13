'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'

/**
 * Generates the next Variable Symbol based on the highest existing VS.
 * Format: Increment from 11771451
 */
export async function generateNextVS() {
  await requirePermission('view_donors')
  const supabase = await createClient()
  
  // Find the highest numeric VS
  const { data, error } = await supabase
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

export async function updateDonor(id: string, data: any) {
  await requirePermission('view_donors')
  const supabase = await createClient()
  
  // 1. Update basic fields
  const { error: updateError } = await supabase
    .from('donors')
    .update({
      title_before: data.title_before || null,
      first_name: data.first_name,
      last_name: data.last_name,
      title_after: data.title_after || null,
      formal_addressing: data.formal_addressing || null,
      email: data.email || null,
      phone: data.phone || null,
      street: data.street || null,
      city: data.city || null,
      postal_code: data.postal_code || null,
      iban: data.iban || null,
      variable_symbol: data.variable_symbol, // Read-only in UI, but kept in payload
      parish_id: data.parish_id || null,
      donor_type: data.donor_type,
      status: data.status,
      notes: data.notes || null,
      newsletter_opt_in: data.newsletter_opt_in || false,
      confirmation_method: data.confirmation_method || null,
      company_name: data.company_name || null,
      ico: data.ico || null,
      dic: data.dic || null,
      website: data.website || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) {
    console.error('Update error:', updateError)
    return { success: false, error: 'Nepodarilo sa uložiť zmeny.' }
  }

  // 2. Update donor_projects (sync)
  if (data.project_ids) {
    // Delete old
    await supabase.from('donor_projects').delete().eq('donor_id', id)
    // Insert new
    if (data.project_ids.length > 0) {
      const pData = data.project_ids.map((pId: string) => ({
        donor_id: id,
        project_id: pId
      }))
      await supabase.from('donor_projects').insert(pData)
    }
  }

  revalidatePath('/admin/darcovia')
  revalidatePath(`/admin/darcovia/${id}`)

  return { success: true }
}

export async function createDonor(data: any) {
  await requirePermission('view_donors')
  const supabase = await createClient()
  
  // Generate VS if not provided
  const vs = data.variable_symbol || await generateNextVS()

  // Vyberieme project_ids pred insertom — nie je stĺpec v tabuľke donors
  const { project_ids, ...donorData } = data

  const { data: newDonor, error } = await supabase
    .from('donors')
    .insert([{
      ...donorData,
      variable_symbol: vs,
      status: donorData.status || 'active'
    }])
    .select()
    .single()

  if (error) {
    console.error('Create error:', error)
    return { success: false, error: error.message }
  }

  // Handle projects for new donor (cez vzťahovú tabuľku donor_projects)
  if (project_ids && project_ids.length > 0) {
    const pData = project_ids.map((pId: string) => ({
      donor_id: newDonor.id,
      project_id: pId
    }))
    await supabase.from('donor_projects').insert(pData)
  }

  revalidatePath('/admin/darcovia')
  return { success: true, id: newDonor.id }
}

export async function toggleDonorStatus(id: string, currentStatus: string) {
  await requirePermission('view_donors')
  const supabase = await createClient()
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  
  const { error } = await supabase
    .from('donors')
    .update({ 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)

  if (error) {
    console.error('Toggle status error:', error)
    return { success: false, error: 'Nepodarilo sa zmeniť stav.' }
  }

  revalidatePath('/admin/darcovia')
  revalidatePath(`/admin/darcovia/${id}`)
  
  return { success: true, newStatus }
}
