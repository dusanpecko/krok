import NavBar from '@/components/public/NavBar'
import Footer from '@/components/public/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
