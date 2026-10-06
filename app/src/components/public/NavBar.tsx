'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Landmark, Users, HandHeart, MessageCircle, Download, Gift, Church, LogOut } from 'lucide-react'
import KrokLogo from '@/components/KrokLogo'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import AccountMenu, { accountItems, useSignOut } from '@/components/public/AccountMenu'
import { getAccountMenu, type AccountMenu as AccountMenuData } from '@/app/(public)/account-actions'

const navLinks = [
  { href: '/vyzvy', label: 'Výzvy', icon: HandHeart },
  { href: '/farnosti', label: 'Farnosti', icon: Church },
  { href: '/podporene-projekty', label: 'Podporené projekty', icon: Landmark },
  { href: '/aktuality', label: 'Aktuality', icon: MessageCircle },
  { href: '/sutaz', label: 'Súťaž', icon: Gift },
  { href: '/na-stiahnutie', label: 'Na stiahnutie', icon: Download },
  { href: '/o-nas', label: 'O nás', icon: Users },
  { href: '/kontakt', label: 'Kontakt', icon: MessageCircle },
]

export default function NavBar() {
  const pathname = usePathname()
  // Celý web je svetlý. Na stránkach s úvodnou sekciou je navbar hore priehľadný,
  // na formulárových stránkach (registrácia, granty) hneď biely.
  const solidPages = ['/registracia', '/granty', '/kontrolor']
  const transparentTop = !solidPages.some(
    (p) => pathname === p || pathname?.startsWith(p + '/')
  )
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { session } = useSupabase()
  // Položky menu „Môj účet“ (profil, farnosť, správa farnosti, administrácia) – pre aktuálneho používateľa
  const [account, setAccount] = useState<{ userId: string; menu: AccountMenuData | null } | null>(null)
  const accountMenu = session?.user && account?.userId === session.user.id ? account.menu : null
  const signOut = useSignOut()
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
    const userId = session?.user?.id
    if (!userId) return
    let cancelled = false
    getAccountMenu()
      .then((menu) => { if (!cancelled) setAccount({ userId, menu }) })
      .catch(() => { if (!cancelled) setAccount({ userId, menu: null }) })
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Dynamické štýly podľa podstránky a stavu skrolovania
  const navBgClass = transparentTop && !scrolled
    ? 'bg-transparent py-4'
    : 'bg-white/95 backdrop-blur-md shadow-sm py-2 border-b border-gray-100'

  const linkClass = 'text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors'
  const loginLinkClass = 'text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <KrokLogo variant="color" height={36} />
          </Link>
 
          {/* Desktop Links */}
          <div className="hidden xl:flex items-center space-x-6">
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
              <AccountMenu menu={accountMenu} />
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
          <div className="xl:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 p-2"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="xl:hidden bg-white absolute top-full left-0 right-0 shadow-xl border-t border-gray-100 p-4 space-y-4">
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
            <div className="space-y-1">
              <p className="px-1 pb-1 text-xs font-black uppercase tracking-widest text-gray-400">
                {accountMenu?.displayName ?? 'Môj účet'}
              </p>
              {accountItems(accountMenu).map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-900 font-bold hover:bg-gray-50"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={18} className="text-gray-400" /> {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 font-medium hover:bg-red-50 hover:text-red cursor-pointer"
              >
                <LogOut size={18} className="text-gray-400" /> Odhlásiť sa
              </button>
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
