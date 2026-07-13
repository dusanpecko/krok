'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/auth'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Získa všetky definované oprávnenia
 */
export async function getPermissions() {
  await requirePermission('manage_roles')
  const { data, error } = await supabaseAdmin
    .from('permissions')
    .select('*')
    .order('name')

  if (error) {
    console.error('[Permissions Actions] getPermissions error:', error)
    return []
  }
  return data || []
}

/**
 * Získa mapovanie všetkých rolí k oprávneniam
 */
export async function getRolePermissions() {
  await requirePermission('manage_roles')
  const { data, error } = await supabaseAdmin
    .from('role_permissions')
    .select('role_id, permission_id')

  if (error) {
    console.error('[Permissions Actions] getRolePermissions error:', error)
    return []
  }
  return data || []
}

/**
 * Získa zoznam všetkých rolí
 */
export async function getRoles() {
  await requirePermission('manage_roles')
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('*')
    .order('name')

  if (error) {
    console.error('[Permissions Actions] getRoles error:', error)
    return []
  }
  return data || []
}

/**
 * Zmení (pridá/odstráni) oprávnenie pre konkrétnu rolu
 */
export async function toggleRolePermission(payload: {
  roleId: string
  permissionId: string
  active: boolean
}) {
  await requirePermission('manage_roles')
  const { roleId, permissionId, active } = payload

  try {
    if (active) {
      const { error } = await supabaseAdmin
        .from('role_permissions')
        .insert({
          role_id: roleId,
          permission_id: permissionId
        })

      if (error) {
        console.error(`[Permissions Actions] Error inserting role permission (${roleId}, ${permissionId}):`, error)
        return { success: false, error: 'Nepodarilo sa priradiť oprávnenie.' }
      }
    } else {
      const { error } = await supabaseAdmin
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)

      if (error) {
        console.error(`[Permissions Actions] Error deleting role permission (${roleId}, ${permissionId}):`, error)
        return { success: false, error: 'Nepodarilo sa odobrať oprávnenie.' }
      }
    }

    revalidatePath('/admin/roly/opravnenia')
    return { success: true }
  } catch (err) {
    console.error('[Permissions Actions] toggleRolePermission unexpected error:', err)
    return { success: false, error: 'Nastala neočakávaná chyba.' }
  }
}
