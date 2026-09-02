'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Landmark, Users, HandHeart, MessageCircle, Download, Gift } from 'lucide-react'
import KrokLogo from '@/components/KrokLogo'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const navLinks = [
  { href: '/podporene-projekty', label: 'Podporené projekty', icon: Landmark },
  { href: '/aktuality', label: 'Aktuality', icon: MessageCircle },
  { href: '/sutaz', label: 'Súťaž', icon: Gift },
  { href: '/na-stiahnutie', label: 'Na stiahnutie', icon: Download },
  { href: '/o-nas', label: 'O nás', icon: Users },
  { href: '/kontakt', label: 'Kontakt', icon: MessageCircle },
]

export default function NavBar() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isDarkHeroPage = pathname === '/' || pathname === '/kontakt' || pathname === '/profil' || pathname === '/na-stiahnutie'
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { session, supabase } = useSupabase()
  const [isAdmin, setIsAdmin] = useState(false)
  // Prihlásený darca ide rovno na kartu Podporiť vo svojom profile, inak na registráciu
  const supportHref = session ? '/profil#podporit' : '/registracia'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false)
      return
    }

    const checkAdmin = async () => {
      try {
        const { data } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        setIsAdmin(!!data)
      } catch {
        setIsAdmin(false)
      }
    }

    checkAdmin()
  }, [session, supabase])

  // Dynamické štýly podľa podstránky a stavu skrolovania
  const navBgClass = isDarkHeroPage
    ? (scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-2 border-b border-gray-100' : 'bg-transparent py-4')
    : 'bg-white/95 backdrop-blur-md shadow-sm py-2 border-b border-gray-100'

  const logoVariant = isDarkHeroPage ? (scrolled ? 'color' : 'white') : 'color'

  const linkClass = isDarkHeroPage && !scrolled
    ? 'text-sm font-medium text-white/90 hover:text-white transition-colors'
    : 'text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors'

  const profileLinkClass = isDarkHeroPage && !scrolled
    ? 'text-sm font-medium text-white/90 hover:text-white transition-colors'
    : 'text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors'

  const adminLinkClass = isDarkHeroPage && !scrolled
    ? 'text-sm font-medium text-white border border-white/50 px-4 py-2 rounded-full hover:bg-white/10 transition-colors'
    : 'text-sm font-medium text-blue-600 border border-blue-600 px-4 py-2 rounded-full hover:bg-blue-50 transition-colors'

  const loginLinkClass = isDarkHeroPage && !scrolled
    ? 'text-sm font-medium text-white/80 hover:text-white transition-colors'
    : 'text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors'

  const mobileMenuBtnClass = isDarkHeroPage && !scrolled ? 'text-white p-2' : 'text-gray-700 p-2'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <KrokLogo variant={logoVariant} height={36} />
          </Link>
 
          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={linkClass}
              >
                {link.label}
              </Link>
            ))}
            
            <Link
              href={supportHref}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <HandHeart size={18} />
              Chcem podporiť
            </Link>
 
            {session ? (
              <div className="flex items-center gap-4">
                <Link 
                  href="/profil"
                  className={profileLinkClass}
                >
                  Profil
                </Link>
                {isAdmin && (
                  <Link 
                    href="/admin"
                    className={adminLinkClass}
                  >
                    Admin
                  </Link>
                )}
              </div>
            ) : (
              <Link 
                href="/prihlasenie"
                className={loginLinkClass}
              >
                Prihlásiť sa
              </Link>
            )}
          </div>
 
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={mobileMenuBtnClass}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white absolute top-full left-0 right-0 shadow-xl border-t border-gray-100 p-4 space-y-4">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className="block text-lg font-medium text-gray-800"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={supportHref}
            className="block w-full py-4 bg-blue-600 text-white text-center rounded-xl font-bold"
            onClick={() => setIsOpen(false)}
          >
            Chcem podporiť
          </Link>
          <hr />
          {session ? (
            <div className="space-y-2">
              <Link 
                href="/profil"
                className="block w-full text-center py-3 bg-gray-50 text-gray-900 font-bold rounded-xl"
                onClick={() => setIsOpen(false)}
              >
                Môj Profil
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin"
                  className="block w-full text-center py-2 text-blue-600 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Do administrácie
                </Link>
              )}
            </div>
          ) : (
            <Link 
              href="/prihlasenie"
              className="block w-full text-center py-2 text-gray-600 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Prihlásiť sa
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
