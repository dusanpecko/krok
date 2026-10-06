'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Church, HandHeart, LayoutDashboard, LogOut, Settings, User } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import type { AccountMenu as AccountMenuData } from '@/app/(public)/account-actions'

interface Item {
  href: string
  label: string
  icon: typeof User
}

/** Položky menu účtu – spoločné pre desktop (rozbaľovacie menu) aj mobil. */
export function accountItems(menu: AccountMenuData | null): Item[] {
  const items: Item[] = [
    { href: '/profil', label: 'Môj profil', icon: User },
    { href: '/profil#dary', label: 'Moje dary', icon: HandHeart },
  ]
  if (menu?.myParishSlug) items.push({ href: `/farnosti/${menu.myParishSlug}`, label: 'Moja farnosť', icon: Church })
  if (menu?.hasParishZone) items.push({ href: '/moja-farnost', label: 'Správa farnosti', icon: Settings })
  if (menu?.canAdmin) items.push({ href: '/admin', label: 'Administrácia', icon: LayoutDashboard })
  return items
}

export function useSignOut() {
  const { supabase } = useSupabase()
  const router = useRouter()
  return async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }
}

/** Tlačidlo „Môj účet“ v navigácii s rozbaľovacím menu (desktop). */
export default function AccountMenu({ menu }: { menu: AccountMenuData | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const signOut = useSignOut()
  const name = menu?.displayName ?? 'Môj účet'

  // Zavretie kliknutím mimo menu a klávesom Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-gray-200 bg-white/70 text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase bg-blue-soft text-blue"
        >
          {name.slice(0, 1)}
        </span>
        <span className="max-w-[9rem] truncate">{name}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-150"
        >
          {accountItems(menu).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-soft/60 hover:text-blue"
            >
              <Icon size={17} className="text-gray-400" /> {label}
            </Link>
          ))}
          <div className="my-2 border-t border-gray-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red cursor-pointer"
          >
            <LogOut size={17} className="text-gray-400" /> Odhlásiť sa
          </button>
        </div>
      )}
    </div>
  )
}
