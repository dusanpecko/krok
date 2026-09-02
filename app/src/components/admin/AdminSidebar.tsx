'use client'

import {
  LayoutDashboard,
  Users,
  Landmark,
  FolderHeart,
  Church,
  FileUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  FileText,
  LogOut,
  Map,
  Database,
  Globe,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useUserRole } from '@/hooks/useUserRole'
import Image from 'next/image'

// KROK brand farby z logomanuálu
const KROK = {
  blue: '#003DA5',       // Hlavná modrá
  lightBlue: '#0072CE',  // Svetlejšia modrá
  red: '#E4002B',        // Červená
  yellow: '#FFD100',     // Žltá
  sidebar: '#002D72',    // Tmavá modrá pre sidebar
  sidebarHover: '#003D99',
  sidebarActive: '#001A4D',
}

const mainLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/', label: 'Zobraziť web', icon: Globe, external: true },
  { href: '/admin/darcovia', label: 'Darcovia', icon: Users, permission: 'view_donors' },
  { href: '/admin/banka', label: 'Banka', icon: Landmark, permission: 'view_bank' },
  { href: '/admin/granty', label: 'Granty', icon: FolderHeart, permission: 'view_grants' },
  { href: '/admin/aktuality', label: 'Aktuality', icon: FileText },
  { href: '/admin/podporene-projekty', label: 'Podporené projekty', icon: FolderHeart },
]

const settingsLinks = [
  { href: '/admin/projekty', label: 'Projekty', icon: Database, permission: 'manage_config' },
  { href: '/admin/nastavenia/farnosti', label: 'Farnosti', icon: Church, permission: 'manage_config' },
  { href: '/admin/nastavenia/dekanaty', label: 'Dekanáty', icon: Map, permission: 'manage_config' },
  { href: '/admin/import', label: 'Import výpisu', icon: FileUp, permission: 'import_bank' },
  { href: '/admin/roly', label: 'Správa rolí', icon: Users, permission: 'manage_roles' },
  { href: '/admin/exporty', label: 'Exporty', icon: FileText, permission: 'view_donors' },
]

interface AdminSidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
  isMobile?: boolean
}

export default function AdminSidebar({ isCollapsed = false, onToggle, isMobile = false }: AdminSidebarProps) {
  const pathname = usePathname()
  const { supabase } = useSupabase()
  const { hasPermission } = useUserRole()
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  const visibleMainLinks = mainLinks.filter(link => !link.permission || hasPermission(link.permission))
  const visibleSettingsLinks = settingsLinks.filter(link => !link.permission || hasPermission(link.permission))
  const hasSettingsAccess = visibleSettingsLinks.length > 0

  useEffect(() => { setMounted(true) }, [])

  const isActive = (href: string, external?: boolean) => {
    if (!mounted || !pathname || external) return false
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside className={`
      h-screen flex flex-col shadow-xl
      transition-all duration-300 ease-in-out
      ${isCollapsed ? 'w-16' : 'w-60'}
      ${isMobile ? 'fixed z-50' : 'sticky top-0'}
    `}
    style={{ backgroundColor: KROK.sidebar }}
    >
      {/* Header – KROK logo */}
      <div className={`flex-shrink-0 border-b border-white/10 ${isCollapsed ? 'p-3' : 'p-5'}`}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          {isCollapsed ? (
            /* Zbalený: len malá ikona loga */
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-white/10">
              <Image
                src="/logo/logo_w.webp"
                alt="KROK"
                width={55}
                height={32}
                className="object-contain"
              />
            </div>
          ) : (
            /* Rozbalený: plné biele logo */
            <Image
              src="/logo/logo_w.webp"
              alt="KROK – Pastoračný fond Žilinskej diecézy"
              width={55}
              height={32}
              priority
            />
          )}
          {onToggle && !isMobile && (
            <button onClick={onToggle} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden lg:flex">
              {isCollapsed ? <ChevronRight size={14} className="text-blue-200" /> : <ChevronLeft size={14} className="text-blue-200" />}
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 min-h-0 flex flex-col">
        <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <div className="space-y-1">
            {/* Sekcia label */}
            {!isCollapsed && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-blue-300/50 uppercase tracking-widest">
                Hlavné
              </p>
            )}

            {visibleMainLinks.map(link => {
              const Icon = link.icon
              const active = isActive(link.href, link.external)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={`group relative flex items-center gap-2.5 rounded-lg transition-all duration-200 ${
                    isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
                  } ${
                    active
                      ? 'bg-white/15 shadow-md border border-white/10'
                      : 'border border-transparent hover:bg-white/8 hover:border-white/5'
                  }`}
                  title={isCollapsed ? link.label : undefined}
                >
                  <div className={`flex-shrink-0 transition-colors ${active ? 'text-yellow-300' : 'text-blue-200/70 group-hover:text-white'}`}>
                    <Icon size={16} />
                  </div>
                  {!isCollapsed && (
                    <span className={`flex-1 text-sm font-medium transition-colors ${
                      active ? 'text-white' : 'text-blue-100/80 group-hover:text-white'
                    }`}>
                      {link.label}
                    </span>
                  )}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                         style={{ backgroundColor: KROK.yellow }} />
                  )}
                  {/* Tooltip collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {link.label}
                    </div>
                  )}
                </Link>
              )
            })}

            {/* Separator */}
            <div className="my-3"><div className="h-px bg-white/10" /></div>

            {/* Nastavenia */}
            {!isCollapsed && (
              <p className="px-3 pt-1 pb-1 text-[10px] font-semibold text-blue-300/50 uppercase tracking-widest">
                Nastavenia & Nástroje
              </p>
            )}
            {hasSettingsAccess && (
              <>
                <button
                  onClick={() => setSettingsExpanded(!settingsExpanded)}
                  className={`w-full group flex items-center gap-2.5 rounded-lg border border-transparent transition-all duration-200 ${
                    isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
                  } hover:bg-white/8`}
                >
                  <Settings size={16} className="text-blue-200/70" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-sm font-medium text-blue-100/80 text-left">Nastavenia</span>
                      {settingsExpanded ? <ChevronUp size={12} className="text-blue-200/50" /> : <ChevronDown size={12} className="text-blue-200/50" />}
                    </>
                  )}
                </button>

                {settingsExpanded && !isCollapsed && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-white/10 pl-2">
                    {visibleSettingsLinks.map(subLink => {
                      const SubIcon = subLink.icon
                      const active = isActive(subLink.href)
                      return (
                        <Link
                          key={subLink.href}
                          href={subLink.href}
                          className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-200 ${
                            active ? 'bg-white/15 text-white' : 'text-blue-100/60 hover:bg-white/8 hover:text-white'
                          }`}
                        >
                          <SubIcon size={14} />
                          <span className="text-xs font-medium">{subLink.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </nav>

        {/* Logout */}
        <div className={`flex-shrink-0 border-t border-white/10 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <button
            onClick={handleLogout}
            className={`w-full group flex items-center gap-2.5 rounded-lg transition-all duration-200 ${
              isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
            } hover:bg-red-500/20 text-blue-200/60 hover:text-red-300`}
          >
            <LogOut size={16} />
            {!isCollapsed && <span className="text-sm font-medium">Odhlásiť sa</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
