'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadBuffer } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'

// Pomocná funkcia na premenu slovenskej diakritiky na slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Automatické udelenie role 'zadavatel' pre prihláseného darcu.
 * Týmto sa z neho stáva Darca + Zadávateľ bez straty pôvodných dát.
 */
export async function upgradeToZadavatel() {
  const supabase = await createClient()

  // 1. Získať súčasného používateľa
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError || !session?.user) {
    return { success: false, error: 'Používateľ nie je prihlásený.' }
  }

  const userId = session.user.id
  const email = session.user.email || ''
  
  // Získať meno z metadát alebo e-mailu
  const name = session.user.user_metadata?.full_name || email.split('@')[0]

  // 2. Zapísať rolu zadavatel v public.user_roles
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      id: userId,
      role: 'zadavatel',
      name: name,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id,role'
    })

  if (roleError) {
    console.error('[Actions] Chyba pri udelení role zadávateľa:', roleError)
    return { success: false, error: 'Nepodarilo sa aktivovať rolu zadávateľa.' }
  }

  // Ak darca nemá profil v donors, vytvoríme ho pre konzistentnosť
  try {
    const { data: donorExists } = await supabase
      .from('donors')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (!donorExists) {
      const parts = name.split(' ')
      const firstName = parts[0] || 'Žiadateľ'
      const lastName = parts.slice(1).join(' ') || 'KROK'

      await supabase.from('donors').insert({
        auth_user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        donor_type: 'individual',
        status: 'active'
      })
    }
  } catch (donorErr) {
    console.warn('[Actions] Upozornenie: Nepodarilo sa vytvoriť donor profil:', donorErr)
  }

  revalidatePath('/granty/dashboard')
  return { success: true }
}

/**
 * Získa zoznam všetkých aktívnych formulárov (výziev)
 */
export async function getActiveForms() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Actions] getActiveForms error:', error)
    return []
  }
  return data
}

/**
 * Získa formulár podľa jeho slugu
 */
export async function getFormBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[Actions] getFormBySlug error:', error)
    return null
  }
  return data
}

/**
 * Získa používateľské roly pre prihláseného usera
 */
export async function getLoggedUserRoles() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return { roles: [], user: null }
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', session.user.id)

  if (error) {
    console.error('[Actions] getLoggedUserRoles error:', error)
    return { roles: [], user: session.user }
  }

  return { 
    roles: data.map(r => r.role), 
    user: session.user 
  }
}

/**
 * Odoslanie žiadosti o projekt / záverečnej správy.
 * Všetky súbory a podpisy sú prenášané ako base64 na strane servera dekódované na buffery a nahrané na Backblaze B2.
 */
export async function submitFormResponse(payload: {
  formId: string
  submissionId?: string // Ak ide o editáciu draftu
  data: Record<string, any>
  files: Record<string, { base64: string; name: string; type: string }>
  signatureBase64: string | null
  isDraft?: boolean
}) {
  const supabase = await createClient()
  
  // Získať používateľa
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return { success: false, error: 'Pre predloženie žiadosti musíte byť prihlásený.' }
  }

  const submissionId = payload.submissionId || crypto.randomUUID()
  const folder = `grants/${payload.formId}/${submissionId}`
  
  const uploadedFiles: Array<{ id: string; name: string; url: string; key: string }> = []
  let signatureUrl = null

  // 1. Spracovať a nahrať bežné prílohy na B2 úložisko
  for (const [fieldId, fileData] of Object.entries(payload.files)) {
    try {
      const buffer = Buffer.from(fileData.base64, 'base64')
      const uploadRes = await uploadBuffer(buffer, fileData.type, `${folder}/files`)
      
      if (uploadRes) {
        uploadedFiles.push({
          id: fieldId,
          name: fileData.name,
          url: uploadRes.url,
          key: uploadRes.key
        })
        
        // Zapíšeme odkaz na súbor aj do hodnôt formulara pre FormEngine
        payload.data[fieldId] = uploadRes.url
      }
    } catch (err) {
      console.error(`[Actions] Zlyhal upload súboru ${fileData.name} na B2:`, err)
      return { success: false, error: `Chyba pri nahrávaní súboru ${fileData.name}. Skúste to znova.` }
    }
  }

  // 2. Spracovať a nahrať digitálny podpis na B2
  if (payload.signatureBase64 && payload.signatureBase64.startsWith('data:image/')) {
    try {
      const base64Data = payload.signatureBase64.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const uploadRes = await uploadBuffer(buffer, 'image/png', `${folder}/signature`)
      
      if (uploadRes) {
        signatureUrl = uploadRes.url
      }
    } catch (err) {
      console.error('[Actions] Zlyhal upload podpisu na B2:', err)
      return { success: false, error: 'Chyba pri ukladaní digitálneho podpisu.' }
    }
  }

  // 3. Rozhodnúť o stave (workflow status)
  const finalStatus = payload.isDraft ? 'draft' : 'submitted'

  // 4. Zápis do public.form_submissions
  const submissionData = {
    id: submissionId,
    form_id: payload.formId,
    user_id: session.user.id,
    data: payload.data,
    files: uploadedFiles,
    status: finalStatus,
    updated_at: new Date().toISOString()
  } as any

  if (signatureUrl) {
    submissionData.signature_url = signatureUrl
  }

  // Ak ide o editáciu existujúceho draftu, robíme upsert/update
  const { error } = await supabase
    .from('form_submissions')
    .upsert({
      ...submissionData,
      ...(payload.submissionId ? {} : { created_at: new Date().toISOString() })
    })

  if (error) {
    console.error('[Actions] submitFormResponse error:', error)
    return { success: false, error: 'Nepodarilo sa uložiť formulár do databázy.' }
  }

  revalidatePath('/granty/dashboard')
  return { success: true, submissionId }
}

/**
 * Získa všetky žiadosti prihláseného zadávateľa
 */
export async function getMySubmissions() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) return []

  const { data, error } = await supabase
    .from('form_submissions')
    .select('*, forms(title)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Actions] getMySubmissions error:', error)
    return []
  }
  return data
}

/**
 * Získa detail prihlášky (pre žiadateľa, kontrolóra aj admina)
 */
export async function getSubmissionById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*, forms(title, slug, fields)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[Actions] getSubmissionById error:', error)
    return null
  }
  return data
}

/**
 * ADMIN: Získa všetky žiadosti pre správu
 */
export async function getAllSubmissions(formId?: string) {
  await requirePermission('view_grants')
  const supabase = await createClient()
  
  let query = supabase
    .from('form_submissions')
    .select('*, forms(title, slug), user_roles!form_submissions_user_id_fkey(name)')
    
  if (formId) {
    query = query.eq('form_id', formId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[Actions] getAllSubmissions error:', error)
    return []
  }
  return data
}

/**
 * KONTROLÓR: Získa prihlášky pridelené na ohodnotenie
 */
export async function getEvaluatorSubmissions() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) return []

  const { data, error } = await supabase
    .from('form_submissions')
    .select('*, forms(title, slug)')
    .eq('assigned_evaluator_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Actions] getEvaluatorSubmissions error:', error)
    return []
  }
  return data
}

/**
 * KONTROLÓR: Odoslanie posudku a známky (1-10)
 */
export async function submitEvaluation(payload: {
  submissionId: string
  rating: number
  notes: string
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return { success: false, error: 'Používateľ nie je prihlásený.' }
  }

  // Bezpečnostná kontrola na serveri: Je to priradený hodnotiteľ?
  const { data: checkData } = await supabase
    .from('form_submissions')
    .select('assigned_evaluator_id')
    .eq('id', payload.submissionId)
    .single()

  if (!checkData || checkData.assigned_evaluator_id !== session.user.id) {
    return { success: false, error: 'Nemáte oprávnenie na ohodnotenie tohto projektu.' }
  }

  const { error } = await supabase
    .from('form_submissions')
    .update({
      evaluation_rating: payload.rating,
      evaluation_notes: payload.notes,
      evaluated_at: new Date().toISOString(),
      status: 'evaluated' // Stav prechádza do hodnoteného
    })
    .eq('id', payload.submissionId)

  if (error) {
    console.error('[Actions] submitEvaluation error:', error)
    return { success: false, error: 'Nepodarilo sa uložiť posudok.' }
  }

  revalidatePath('/kontrolor/dashboard')
  revalidatePath(`/admin/granty/submissions/${payload.submissionId}`)
  return { success: true }
}

/**
 * ADMIN: Priradenie hodnotiteľa (kontrolóra)
 */
export async function assignEvaluator(submissionId: string, evaluatorId: string | null) {
  await requirePermission('view_grants')
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('form_submissions')
    .update({
      assigned_evaluator_id: evaluatorId,
      status: evaluatorId ? 'accepted_for_evaluation' : 'submitted'
    })
    .eq('id', submissionId)

  if (error) {
    console.error('[Actions] assignEvaluator error:', error)
    return { success: false, error: 'Nepodarilo sa priradiť kontrolóra.' }
  }

  revalidatePath('/admin/granty')
  return { success: true }
}

/**
 * ADMIN: Zoznam všetkých kontrolórov v systéme
 */
export async function getEvaluatorsList() {
  await requirePermission('view_grants')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, name')
    .eq('role', 'kontrolor')

  if (error) {
    console.error('[Actions] getEvaluatorsList error:', error)
    return []
  }
  return data
}

/**
 * ADMIN: Celkový update stavu a interných poznámok (napr. Vrátenie na doplnenie)
 */
export async function updateWorkflowStatus(payload: {
  submissionId: string
  status: 'draft' | 'submitted' | 'returned_for_changes' | 'accepted_for_evaluation' | 'evaluated' | 'approved' | 'rejected'
  approvedAmount?: number | null
  vs?: string | null
  ss?: string | null
  adminNotes?: string | null
}) {
  await requirePermission('view_grants')
  const supabase = await createClient()

  const { error } = await supabase
    .from('form_submissions')
    .update({
      status: payload.status,
      approved_amount: payload.approvedAmount || null,
      variable_symbol: payload.vs || null,
      specific_symbol: payload.ss || null,
      admin_notes: payload.adminNotes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', payload.submissionId)

  if (error) {
    console.error('[Actions] updateWorkflowStatus error:', error)
    return { success: false, error: 'Nepodarilo sa aktualizovať stav.' }
  }

  revalidatePath('/admin/granty')
  revalidatePath(`/admin/granty/submissions/${payload.submissionId}`)
  revalidatePath('/granty/dashboard')
  return { success: true }
}

/**
 * ADMIN: Schválenie a automatické vytvorenie prepojeného projektu v KROK databáze!
 */
export async function approveAndCreateProject(submissionId: string, approvedAmount: number, vs: string, ss: string) {
  await requirePermission('view_grants')
  const supabase = await createClient()

  // 1. Získať dáta prihlášky
  const { data: sub, error: subError } = await supabase
    .from('form_submissions')
    .select('*, forms(title)')
    .eq('id', submissionId)
    .single()

  if (subError || !sub) {
    return { success: false, error: 'Nepodarilo sa načítať detaily prihlášky.' }
  }

  const projectName = sub.data.text_5 || `Grantový projekt – ${sub.id.substring(0, 6)}`
  const projectDesc = sub.data.textarea_1 || `Projekt schválený v grantovej výzve: ${sub.forms.title}`
  const projectSlug = generateSlug(projectName) + '-' + sub.id.substring(0, 4)
  const imageB2Url = sub.data.file_2 || null // ilustračná fotka z B2

  // 2. Vložiť/vytvoriť projekt v tabuľke projects
  const { data: newProj, error: projError } = await supabase
    .from('projects')
    .insert({
      name: projectName,
      slug: projectSlug,
      description: projectDesc,
      category: 'evangelization',
      status: 'active',
      target_amount: approvedAmount,
      specific_symbol: ss,
      image_url: imageB2Url,
      visible_on_web: true
    })
    .select('id')
    .single()

  if (projError) {
    console.error('[Actions] Zlyhalo vytvorenie projektu:', projError)
    return { success: false, error: 'Zlyhalo vytvorenie záznamu projektu v databáze.' }
  }

  // 3. Aktualizovať prihlášku: stav approved, uložiť project_id, VS, ŠS a sumu
  const { error: updateError } = await supabase
    .from('form_submissions')
    .update({
      project_id: newProj.id,
      status: 'approved',
      approved_amount: approvedAmount,
      variable_symbol: vs,
      specific_symbol: ss,
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)

  if (updateError) {
    console.error('[Actions] Zlyhal update prihlášky po schválení:', updateError)
    return { success: false, error: 'Projekt bol vytvorený, ale nepodarilo sa prepojiť prihlášku.' }
  }

  // Prepojiť žiadateľa (ako donora) k tomuto novému projektu (nepovinné, pre kompatibilitu s darcami)
  try {
    await supabase.from('donor_projects').insert({
      project_id: newProj.id,
      variable_symbol: vs
    })
  } catch (donorProjErr) {
    console.warn('[Actions] Upozornenie: Zlyhalo prepojenie donor_projects:', donorProjErr)
  }

  revalidatePath('/admin/granty')
  revalidatePath('/admin/projekty')
  revalidatePath('/granty/dashboard')
  return { success: true }
}

/**
 * ADMIN: Vytvorenie úplne novej grantovej výzvy (formulára)
 */
export async function createNewForm(payload: {
  title: string
  slug: string
  description: string
  fields: any[]
}) {
  await requirePermission('view_grants')
  const supabase = await createClient()

  const { error } = await supabase
    .from('forms')
    .insert({
      title: payload.title,
      slug: generateSlug(payload.slug),
      description: payload.description,
      fields: payload.fields,
      status: 'active'
    })

  if (error) {
    console.error('[Actions] createNewForm error:', error)
    return { success: false, error: 'Nepodarilo sa vytvoriť novú výzvu. Skontrolujte či slug nie je duplicitný.' }
  }

  revalidatePath('/admin/granty')
  return { success: true }
}
