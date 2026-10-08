import NavBar from '@/components/public/NavBar'
import Footer from '@/components/public/Footer'
import DczaHeader from '@/components/dcza/DczaHeader'
import DczaFooter from '@/components/dcza/DczaFooter'
import { getSite } from '@/lib/site-server'
import { getPageTree } from '@/lib/diocese/public'
import { mainNav } from '@/lib/diocese/nav'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // spoločné stránky (farnosti, kňazská zóna, prihlásenie) na dcza.sk v hlavičke diecézy (§ 20)
  if ((await getSite()) === 'dcza') {
    const nav = mainNav(await getPageTree())
    return (
      <div className="flex flex-col min-h-screen">
        <DczaHeader nav={nav} />
        {/* hlavička diecézy zaberá miesto (sticky) – stránky s -mt-24 sa podsunú pod ňu */}
        <main className="flex-grow">{children}</main>
        <DczaFooter nav={nav} />
      </div>
    )
  }
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-grow pt-24 lg:pt-32">
        {children}
      </main>
      <Footer />
    </div>
  )
}
