import Image from 'next/image'
import { KROK_ORG } from '@/lib/legal'
import Link from 'next/link'
import NewsletterSignup from './NewsletterSignup'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-6">
              <Image
                src="/logo/logo_w.webp"
                alt="KROK – Pastoračný fond Žilinskej diecézy"
                width={83}
                height={48}
                className=""
              />
            </div>
            <p className="text-gray-400 max-w-sm mb-8">
              Pastoračný fond Žilinskej diecézy podporuje aktivity v oblasti pastorácie, vzdelávania a pomoci blížnym.
            </p>
            <NewsletterSignup source="footer" />
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-6">Navigácia</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link href="/o-nas" className="hover:text-white transition-colors">O nás</Link></li>
              <li><Link href="/vyzvy" className="hover:text-white transition-colors">Výzvy na podporu</Link></li>
              <li><Link href="/farnosti" className="hover:text-white transition-colors">Farnosti – omše a kontakty</Link></li>
              <li><Link href="/podporene-projekty" className="hover:text-white transition-colors">Podporené projekty</Link></li>
              <li><Link href="/registracia" className="hover:text-white transition-colors">Chcem podporiť</Link></li>
              <li><Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link></li>
              <li><a href="https://www.dcza.sk" target="_blank" rel="noopener" className="hover:text-white transition-colors">Žilinská diecéza – dcza.sk ↗</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-lg mb-6">Právne info</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link href="/ochrana-udajov" className="hover:text-white transition-colors">Ochrana osobných údajov</Link></li>
              <li><Link href="/podmienky" className="hover:text-white transition-colors">Všeobecné podmienky</Link></li>
              {KROK_ORG.ico && <li className="text-sm font-mono mt-4">IČO: {KROK_ORG.ico}</li>}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} KROK – Pastoračný fond Žilinskej diecézy. Všetky práva vyhradené.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-gray-500 text-xs">
            <p>
              Created with ❤️ for <a href="https://www.dcza.sk" target="_blank" rel="noopener" className="hover:text-white transition-colors underline-offset-2 hover:underline">Žilinská diecéza</a>
            </p>
            <span className="hidden sm:block w-px h-4 bg-gray-700" aria-hidden />
            <a href="https://www.lectio.one" target="_blank" rel="noopener" className="group inline-flex items-center gap-2 hover:text-white transition-colors">
              Beží na platforme
              <Image src="/lectio/lectio_logo_white.webp" alt="lectio.one" width={800} height={142} className="h-4 w-auto opacity-70 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
