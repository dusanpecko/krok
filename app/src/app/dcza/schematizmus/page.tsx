import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { alternates: { canonical: '/schematizmus' } }

export default function SchematizmusHub() {
  redirect('/schematizmus/knazi')
}
