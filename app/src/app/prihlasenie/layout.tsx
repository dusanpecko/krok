import { siteIconsMetadata } from '@/lib/site-server'

/** Ikona prehliadača podľa domény (dcza.sk → erb, mojkrok.sk → logo Kroku). */
export const generateMetadata = siteIconsMetadata

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
