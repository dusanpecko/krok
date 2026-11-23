import NavBar from '@/components/public/NavBar'
import Footer from '@/components/public/Footer'
import DczaFloatingLink from '@/components/public/DczaFloatingLink'
import KrokAnnouncement from '@/components/public/KrokAnnouncement'
import { KROK_ANNOUNCEMENT } from '@/lib/krok/announcement'

/**
 * Stránky len pre mojkrok.sk – na dcza.sk ich middleware prepisuje na /dcza/…, takže tento layout
 * nemusí zisťovať web z hlavičiek (headers() by vypol cache všetkých stránok pod ním).
 * Stránky spoločné pre oba weby (farnosti, kňazská zóna, profil) sú v skupine (shared).
 * revalidate = najdlhšia doba cache stránok pod layoutom (ISR); platí najnižšia hodnota z layoutu a stránky.
 */
export const revalidate = 300

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="grow pt-24 lg:pt-32">
        {children}
      </main>
      <Footer />
      <DczaFloatingLink />
      {KROK_ANNOUNCEMENT && <KrokAnnouncement announcement={KROK_ANNOUNCEMENT} />}
    </div>
  )
}
