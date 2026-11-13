import type { Metadata } from 'next'
import { dioceseDb, getPageTree } from '@/lib/diocese/public'
import { getPublicContacts } from '@/lib/diocese/contacts'
import DczaPageFrame from '@/components/dcza/DczaPageFrame'
import ContactsList from '@/components/dcza/ContactsList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Kontakty',
  description: 'Kontakty Biskupského úradu v Žiline – kúria, tribunál, úrady, čas vyhradený pre verejnosť.',
}

/** Kontakty z databázy (065) – spravujú sa v admine Web diecézy → Kontakty. */
export default async function ContactsPage() {
  const [tree, sections] = await Promise.all([getPageTree(), getPublicContacts(dioceseDb())])
  return (
    <DczaPageFrame tree={tree} path="kontakty">
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight leading-tight">Kontakty</h1>
      {sections.length ? <ContactsList sections={sections} /> : <p className="mt-8 text-mute">Kontakty pripravujeme.</p>}
    </DczaPageFrame>
  )
}
