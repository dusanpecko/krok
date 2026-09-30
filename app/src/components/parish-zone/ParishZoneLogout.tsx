'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export default function ParishZoneLogout() {
  const { supabase } = useSupabase()
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await supabase.auth.signOut()
        router.push('/prihlasenie')
        router.refresh()
      }}
      className="inline-flex items-center gap-1.5 text-white/70 hover:text-white cursor-pointer"
    >
      <LogOut size={14} /> Odhlásiť
    </button>
  )
}
