'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useEffect, useState } from 'react'

export function useUserRole() {
  const { supabase, session } = useSupabase()
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkRole() {
      if (!session?.user?.id) {
        setIsAdmin(false)
        setRole(null)
        setRoles([])
        setPermissions([])
        setLoading(false)
        return
      }

      try {
        // 1. Získať dynamic roly používateľa
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', session.user.id)

        // 2. Skontrolovať legacy admin_users tabuľku pre prístup k admin zóne
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        // 3. Získať oprávnenia pre roly používateľa cez pomocný pohľad (view)
        const { data: permsData, error: permsError } = await supabase
          .from('v_user_permissions')
          .select('permission_id')
          .eq('user_id', session.user.id)

        const activeRoles = userRolesData ? userRolesData.map((r: any) => r.role) : []
        const activePermissions = (!permsError && permsData) ? permsData.map((p: any) => p.permission_id) : []
        const hasAdminRole = activeRoles.includes('administrator') || !!adminData

        setIsAdmin(hasAdminRole)
        setRole(adminData?.role || (activeRoles.includes('administrator') ? 'admin' : activeRoles[0] || null))
        setRoles(activeRoles)
        setPermissions(activePermissions)
      } catch (err) {
        console.error('Error checking user roles/permissions:', err)
        setIsAdmin(false)
        setRole(null)
        setRoles([])
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [session, supabase])

  const hasPermission = (permission: string) => {
    if (isAdmin) return true // Administrátor má prístup ku všetkému
    return permissions.includes(permission)
  }

  return { isAdmin, role, roles, permissions, hasPermission, loading }
}
