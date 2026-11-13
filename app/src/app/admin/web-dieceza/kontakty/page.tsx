import { adminLoadContacts } from '../actions'
import ContactsAdmin from '@/components/admin/diocese/ContactsAdmin'

export const dynamic = 'force-dynamic'

export default async function ContactsAdminPage() {
  return <ContactsAdmin data={await adminLoadContacts()} />
}
