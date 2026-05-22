'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useEffect, useState } from 'react'

export function useUserRole() {
  const { supabase, session } = useSupabase()
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkRole() {
      if (!session?.user?.id) {
        setIsAdmin(false)
        setRole(null)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (error || !data) {
          setIsAdmin(false)
          setRole(null)
        } else {
          setIsAdmin(true)
          setRole(data.role)
        }
      } catch {
        setIsAdmin(false)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [session, supabase])

  return { isAdmin, role, loading }
}
