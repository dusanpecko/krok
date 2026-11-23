'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { allocateDonorVs } from '@/lib/donors/vs'
import { sendDonorWelcomeEmail } from '@/lib/email/notifications'
import { addDonorProject, validateParishId, validateProjectId } from '@/lib/parishes/choices'
import { NO_PARISH } from '@/lib/parishes/constants'

function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/**
 * Profil darcu prihláseného používateľa (návrh farností § 6.4 – O21).
 * Poradie hľadania:
 *  1. auth_user_id = používateľ → tento riadok; ak sa zmenil e-mail v účte, zosynchronizuje sa
 *  2. e-mail (ešte neprepojený darca, napr. z FileMakeru) → doplní sa auth_user_id
 *  3. inak sa založí nový darca (VS zo sekvencie; farnosť a projekt z registrácie, overené)
 * Zmena e-mailu v účte tak nikdy nezaloží druhý profil.
 */
export async function getCurrentDonor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const userEmail = user.email?.trim().toLowerCase() || null
  const admin = serviceClient()

  const { data: byAuth } = await admin.from('donors').select('id, email').eq('auth_user_id', user.id).maybeSingle()

  if (byAuth) {
    if (userEmail && (byAuth.email || '').toLowerCase() !== userEmail) {
      await admin.from('donors').update({ email: userEmail, updated_at: new Date().toISOString() }).eq('id', byAuth.id)
    }
  } else if (userEmail) {
    const meta = (user.user_metadata || {}) as Record<string, unknown>
    const parishId = await validateParishId(admin, meta.parish_id)
    const projectId = await validateProjectId(admin, meta.project_id)
    const choiceMade = meta.parish_id === NO_PARISH || !!parishId || !!projectId

    const { data: byEmail } = await admin
      .from('donors')
      .select('id, parish_id')
      .ilike('email', userEmail)
      .is('auth_user_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (byEmail) {
      // Prvé prepojenie existujúceho darcu s účtom (podmienka auth_user_id IS NULL –
      // pri súbežnom načítaní prepojí a pošle uvítací e-mail len jedno volanie)
      const { data: linked, error } = await admin
        .from('donors')
        .update({
          auth_user_id: user.id,
          ...(parishId && !byEmail.parish_id ? { parish_id: parishId } : {}),
          ...(choiceMade ? { onboarding_completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', byEmail.id)
        .is('auth_user_id', null)
        .select('id')
        .maybeSingle()
      if (error) console.error('[getCurrentDonor] Prepojenie auth_user_id zlyhalo:', error.message)
      await addDonorProject(admin, byEmail.id, projectId)
      if (linked) await sendDonorWelcomeEmail(linked.id)
    } else {
      // Nový darca (registrácia e-mailom aj cez Google). Meno z metadát registrácie, inak z full_name / e-mailu.
      const fallbackName = String(meta.full_name || meta.name || userEmail.split('@')[0])
      const parts = fallbackName.split(' ')
      const firstName = String(meta.first_name || parts[0] || 'Darca')
      const lastName = String(meta.last_name || parts.slice(1).join(' ') || 'KROK')

      try {
        const vs = await allocateDonorVs(admin)
        const { data: created, error } = await admin
          .from('donors')
          .insert({
            auth_user_id: user.id,
            email: userEmail,
            first_name: firstName,
            last_name: lastName,
            variable_symbol: vs,
            parish_id: parishId,
            donor_type: 'individual',
            status: 'active',
            registered_at: new Date().toISOString(),
            onboarding_completed_at: choiceMade ? new Date().toISOString() : null,
          })
          .select('id')
          .single()
        if (error) console.error('[getCurrentDonor] Založenie profilu zlyhalo:', error.message)
        if (created) {
          await addDonorProject(admin, created.id, projectId)
          await sendDonorWelcomeEmail(created.id)
        }
      } catch (e) {
        console.error('[getCurrentDonor]', e instanceof Error ? e.message : e)
      }
    }
  }

  // Načítanie cez klienta používateľa (RLS prepustí vlastný riadok podľa auth_user_id)
  const { data: donor, error } = await supabase
    .from('donors')
    .select(`
      *,
      parishes (
        id,
        name
      )
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (error || !donor) {
    if (error) console.error('Error fetching donor after sync:', error)
    return null
  }
  // donor_projects má RLS len pre admina – podporované projekty doplníme servisným klientom
  const { data: donorProjects } = await admin.from('donor_projects').select('project_id').eq('donor_id', donor.id)
  return { ...donor, donor_projects: (donorProjects ?? []) as { project_id: string }[] }
}

/** Darca ešte nepotvrdil výber farnosti / projektu → presmerovať na /profil/vitajte. */
export async function donorNeedsOnboarding(donor: {
  parish_id?: string | null
  onboarding_completed_at?: string | null
  donor_projects?: { project_id: string }[] | null
} | null): Promise<boolean> {
  if (!donor) return false
  return !donor.onboarding_completed_at && !donor.parish_id && !(donor.donor_projects?.length)
}

/**
 * Onboarding (/profil/vitajte): farnosť (alebo „nepatrím do farnosti“) + voliteľne projekt.
 */
export async function saveOnboarding(data: { parish_id: string; project_id?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Neprihlásený používateľ' }

  const admin = serviceClient()
  const parishId = data.parish_id === NO_PARISH ? null : await validateParishId(admin, data.parish_id)
  if (data.parish_id !== NO_PARISH && !parishId) return { success: false as const, error: 'Vyberte farnosť zo zoznamu.' }
  const projectId = await validateProjectId(admin, data.project_id)

  const { data: donor } = await admin.from('donors').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!donor) return { success: false as const, error: 'Profil darcu sa nenašiel.' }

  const { error } = await admin
    .from('donors')
    .update({ parish_id: parishId, onboarding_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', donor.id)
  if (error) return { success: false as const, error: 'Nepodarilo sa uložiť výber.' }
  await addDonorProject(admin, donor.id, projectId)

  revalidatePath('/profil')
  return { success: true as const }
}

export async function updateProfile(data: {
  first_name: string
  last_name: string
  phone?: string | null
  street?: string | null
  city?: string | null
  postal_code?: string | null
  /** id farnosti alebo 'none' */
  parish_id?: string | null
  /** zmena podporovaného projektu: predošlý → nový */
  project_id?: string | null
  previous_project_id?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Neprihlásený používateľ' }

  const admin = serviceClient()
  const { data: donor } = await admin.from('donors').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!donor) return { success: false, error: 'Profil darcu sa nenašiel.' }

  const parishPatch: Record<string, unknown> = {}
  if (data.parish_id !== undefined) {
    const parishId = data.parish_id === NO_PARISH || !data.parish_id ? null : await validateParishId(admin, data.parish_id)
    if (data.parish_id && data.parish_id !== NO_PARISH && !parishId) return { success: false, error: 'Vyberte farnosť zo zoznamu.' }
    parishPatch.parish_id = parishId
    parishPatch.onboarding_completed_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('donors')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      street: data.street || null,
      city: data.city || null,
      postal_code: data.postal_code || null,
      ...parishPatch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', donor.id)

  if (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Nepodarilo sa uložiť zmeny.' }
  }

  // Projekt meníme len ak ho darca v profile zmenil (iné väzby nastavené v admine ostávajú)
  if (data.project_id !== undefined && (data.project_id || null) !== (data.previous_project_id || null)) {
    if (data.previous_project_id) {
      await admin.from('donor_projects').delete().eq('donor_id', donor.id).eq('project_id', data.previous_project_id)
    }
    await addDonorProject(admin, donor.id, await validateProjectId(admin, data.project_id))
  }

  revalidatePath('/profil')
  return { success: true }
}

/**
 * Doplnenie profilu z popupu po registrácii (voliteľné údaje).
 * Overí identitu cez cookie session, potom zapíše cez service_role
 * (RLS na donor_projects je len pre admina).
 */
export async function completeProfile(data: {
  phone?: string
  street?: string
  city?: string
  postal_code?: string
  parish_id?: string | null
  donation_program?: string
  custom_amount?: number | null
  project_id?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Neprihlásený používateľ' }

  const admin = serviceClient()

  const { data: donor } = await admin
    .from('donors')
    .select('id, notes')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!donor) return { success: false, error: 'Profil darcu sa nenašiel.' }

  // Darcovský program uložíme do poznámok (donors nemá stĺpec na sumu)
  let notes = donor.notes || ''
  if (data.donation_program) {
    const amt = data.custom_amount ? ` (${data.custom_amount} € mesačne)` : ''
    const line = `Zvolený darcovský program: ${data.donation_program}${amt}`
    notes = notes ? `${notes}\n${line}` : line
  }

  const { error: upErr } = await admin
    .from('donors')
    .update({
      phone: data.phone?.trim() || null,
      street: data.street?.trim() || null,
      city: data.city?.trim() || null,
      postal_code: data.postal_code?.trim() || null,
      parish_id: await validateParishId(admin, data.parish_id),
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', donor.id)

  if (upErr) {
    console.error('completeProfile update error:', upErr.message)
    return { success: false, error: 'Nepodarilo sa uložiť údaje.' }
  }

  // Prepojenie s podporeným projektom (ak zvolený a ešte neexistuje)
  await addDonorProject(admin, donor.id, await validateProjectId(admin, data.project_id))

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
