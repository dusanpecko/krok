import { siteIconsMetadata } from '@/lib/site-server'
import AdminShell from './AdminShell'

/** Ikona prehliadača podľa domény (dcza.sk/admin → erb); samotná administrácia je v AdminShell (klient). */
export const generateMetadata = siteIconsMetadata

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
