'use client'

import { LogOut } from 'lucide-react'
import { useSignOut } from '@/components/public/AccountMenu'

export default function ZoneLogout() {
  const signOut = useSignOut()
  return (
    <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 font-bold text-blue hover:underline cursor-pointer">
      <LogOut size={14} /> Odhlásiť
    </button>
  )
}
