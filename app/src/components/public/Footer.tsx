import Link from 'next/link'
import KrokLogo from '@/components/KrokLogo'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <KrokLogo className="h-12 mb-6" height={48} />
            <p className="text-gray-400 max-w-sm mb-6">
              Pastoračný fond Žilinskej diecézy podporuje aktivity v oblasti pastorácie, vzdelávania a pomoci blížnym.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-6">Navigácia</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link href="/o-nas" className="hover:text-white transition-colors">O nás</Link></li>
              <li><Link href="/projekty" className="hover:text-white transition-colors">Projekty</Link></li>
              <li><Link href="/registracia" className="hover:text-white transition-colors">Chcem podporiť</Link></li>
              <li><Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-lg mb-6">Právne info</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link href="/ochrana-udajov" className="hover:text-white transition-colors">Ochrana osobných údajov</Link></li>
              <li><Link href="/podmienky" className="hover:text-white transition-colors">Všeobecné podmienky</Link></li>
              <li className="text-sm font-mono mt-4">IČO: 55 97 15 21</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} KROK – Pastoračný fond Žilinskej diecézy. Všetky práva vyhradené.
          </p>
          <p className="text-gray-500 text-xs">
            Created with ❤️ for Žilinská diecéza
          </p>
        </div>
      </div>
    </footer>
  )
}
