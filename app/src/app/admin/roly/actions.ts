'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/auth'

// Vytvoriť privilegovaného admin klienta na čítanie a správu rolí
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Získa zoznam všetkých registrovaných účtov z auth.users
 * a dynamicky ich spáruje s darcami (public.donors) a rolami (public.user_roles)
 */
export async function getUsersWithRoles() {
  await requirePermission('manage_roles')
  // 1. Získať zoznam všetkých reálne registrovaných účtov zo Supabase Auth
  const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers()

  if (authError) {
    console.error('[Actions] listUsers error:', authError)
    return []
  }

  // 2. Načítať všetkých darcov pre priradenie VS a reálneho mena
  const { data: donors, error: donorsError } = await supabaseAdmin
    .from('donors')
    .select('auth_user_id, first_name, last_name, email, variable_symbol')

  if (donorsError) {
    console.error('[Actions] getUsersWithRoles error loading donors:', donorsError)
  }

  // 3. Načítať všetky priradené roly
  const { data: roles, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('id, role')

  if (rolesError) {
    console.error('[Actions] getUsersWithRoles error loading roles:', rolesError)
  }

  // Skupinovať roly podľa ID používateľa
  const userRolesMap: Record<string, string[]> = {}
  if (roles) {
    roles.forEach(r => {
      if (!userRolesMap[r.id]) {
        userRolesMap[r.id] = []
      }
      userRolesMap[r.id].push(r.role)
    })
  }

  // Skupinovať darcov podľa ID používateľa a podľa e-mailu pre obojstranné párovanie
  const donorsMapByUserId: Record<string, any> = {}
  const donorsMapByEmail: Record<string, any> = {}
  if (donors) {
    donors.forEach(d => {
      if (d.auth_user_id) {
        donorsMapByUserId[d.auth_user_id] = d
      }
      if (d.email) {
        donorsMapByEmail[d.email.toLowerCase().trim()] = d
      }
    })
  }

  // 4. Prepojiť authUsers s darcami a rolami
  const unifiedUsers = authUsers.map(user => {
    const userEmail = user.email?.toLowerCase().trim() || ''
    
    // Hľadať darcu najprv podľa auth_user_id, potom podľa e-mailu
    const donor = donorsMapByUserId[user.id] || (userEmail ? donorsMapByEmail[userEmail] : null)
    
    let name = ''
    if (donor) {
      name = `${donor.first_name} ${donor.last_name}`.trim()
    } else {
      // Ak nemáme prepojeného darcu, skúsime načítať meno z metadát (napr. Google Full Name)
      name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Registrovaný používateľ'
    }

    const vs = donor?.variable_symbol || 'Bez VS (Darca)'
    const rolesList = userRolesMap[user.id] || []

    return {
      userId: user.id,
      name,
      email: user.email || 'Bez e-mailu',
      vs,
      roles: rolesList
    }
  })

  // Zoradiť abecedne podľa mena pre prehľadnosť v UI
  return unifiedUsers.sort((a, b) => a.name.localeCompare(b.name, 'sk'))
}

/**
 * Získa zoznam všetkých dostupných rolí z public.roles
 */
export async function getAvailableRoles() {
  await requirePermission('manage_roles')
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('*')
    .order('name')

  if (error) {
    console.error('[Actions] getAvailableRoles error:', error)
    return []
  }
  return data || []
}

/**
 * Zmena/nastavenie role pre vybraného používateľa
 */
export async function toggleUserRole(payload: {
  userId: string
  role: string
  active: boolean
  userName: string
}) {
  await requirePermission('manage_roles')
  const { userId, role, active, userName } = payload

  if (active) {
    // A. PRIDANIE ROLE
    // 1. Zápis do public.user_roles
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        id: userId,
        role: role,
        name: userName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id,role'
      })

    if (roleError) {
      console.error(`[Actions] Zlyhalo udelenie role ${role}:`, roleError)
      return { success: false, error: `Nepodarilo sa udeliť rolu ${role}.` }
    }

    // 2. Ak ide o administrátora, musíme ho zapísať aj do public.admin_users pre prístup do /admin
    if (role === 'administrator') {
      const { error: adminError } = await supabaseAdmin
        .from('admin_users')
        .upsert({
          id: userId,
          role: 'admin',
          name: userName,
          created_at: new Date().toISOString()
        })

      if (adminError) {
        console.error('[Actions] Zlyhal zápis do admin_users:', adminError)
        // Pokúsime sa vrátiť rolu späť v prípade zlyhania
        await supabaseAdmin.from('user_roles').delete().eq('id', userId).eq('role', 'administrator')
        return { success: false, error: 'Nepodarilo sa synchronizovať práva s tabuľkou admin_users.' }
      }
    }

  } else {
    // B. ODOBRANIE ROLE
    // 1. Výmaz z public.user_roles
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('id', userId)
      .eq('role', role)

    if (deleteRoleError) {
      console.error(`[Actions] Zlyhalo odobranie role ${role}:`, deleteRoleError)
      return { success: false, error: `Nepodarilo sa odobrať rolu ${role}.` }
    }

    // 2. Ak ide o administrátora, odstránime ho z public.admin_users
    if (role === 'administrator') {
      const { error: deleteAdminError } = await supabaseAdmin
        .from('admin_users')
        .delete()
        .eq('id', userId)

      if (deleteAdminError) {
        console.error('[Actions] Zlyhalo odstránenie z admin_users:', deleteAdminError)
        return { success: false, error: 'Rola bola odobratá, ale nepodarilo sa ju vymazať z admin_users.' }
      }
    }
  }

  revalidatePath('/admin/roly')
  return { success: true }
}

