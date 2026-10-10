import NavBar from '@/components/public/NavBar'
import Footer from '@/components/public/Footer'
import DczaHeader from '@/components/dcza/DczaHeader'
import DczaFooter from '@/components/dcza/DczaFooter'
import { getSite } from '@/lib/site-server'
import { getPageTree } from '@/lib/diocese/public'
import { mainNav } from '@/lib/diocese/nav'
import { listCuriaLinks } from '@/lib/diocese/schematizmus'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // spoločné stránky (farnosti, kňazská zóna, prihlásenie) na dcza.sk v hlavičke diecézy (§ 20)
  if ((await getSite()) === 'dcza') {
    const nav = mainNav(await getPageTree(), await listCuriaLinks())
    return (
      <div className="flex flex-col min-h-screen">
        <DczaHeader nav={nav} />
        {/* hlavička diecézy je v toku stránky (tmavá lišta odíde hore, menu je lepkavé) – stránky s -mt-24 ho na dcza.sk nesmú použiť */}
        <main className="grow">{children}</main>
        <DczaFooter nav={nav} />
      </div>
    )
  }
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="grow pt-24 lg:pt-32">
        {children}
      </main>
      <Footer />
    </div>
  )
}
