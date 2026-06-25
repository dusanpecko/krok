'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useUserRole } from '@/hooks/useUserRole'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'

const routePermissionsMap: Record<string, string> = {
  '/admin/darcovia': 'view_donors',
  '/admin/banka': 'view_bank',
  '/admin/import': 'import_bank',
  '/admin/granty': 'view_grants',
  '/admin/roly': 'manage_roles',
  '/admin/projekty': 'manage_config',
  '/admin/nastavenia/farnosti': 'manage_config',
  '/admin/nastavenia/dekanaty': 'manage_config',
  '/admin/exporty': 'view_donors',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, sessionChecked } = useSupabase()
  const { isAdmin, roles, hasPermission, loading: roleLoading } = useUserRole()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (sessionChecked && session === null) {
      router.replace(`/prihlasenie?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [session, router, sessionChecked])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Zistiť, či je pre aktuálnu cestu potrebné oprávnenie
  const matchedRoute = Object.keys(routePermissionsMap).find(
    route => pathname === route || pathname.startsWith(route + '/')
  )
  const requiredPermission = matchedRoute ? routePermissionsMap[matchedRoute] : null

  // Prístup do administrácie vyžaduje buď rolu administrator, alebo aspoň jednu priradenú rolu
  const hasAccess = isAdmin || roles.length > 0
  const isAuthorized = hasAccess && (!requiredPermission || hasPermission(requiredPermission))

  // Prístup zamietnutý
  if (sessionChecked && session && !roleLoading && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Prístup zamietnutý</h2>
          <p className="text-gray-500 mb-6">
            {hasAccess 
              ? 'Nemáte dostatočné oprávnenia na zobrazenie tejto sekcie.' 
              : 'Nemáte oprávnenie na prístup do administrácie KROK.'}
          </p>
          <button 
            onClick={() => router.replace(hasAccess ? '/admin' : '/')} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer"
          >
            {hasAccess ? 'Späť na Dashboard' : 'Späť na hlavnú stránku'}
          </button>
        </div>
      </div>
    )
  }

  // Loading
  if (!sessionChecked || (session && roleLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <p className="text-gray-500 text-sm">Načítavam administráciu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      {(!isMobile || sidebarOpen) && (
        <div className={isMobile ? 'fixed top-0 bottom-0 left-0 z-40 w-60' : 'flex-shrink-0'}>
          <AdminSidebar
            isCollapsed={isMobile ? false : !sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile menu button */}
        {isMobile && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-40 p-3 bg-white rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
