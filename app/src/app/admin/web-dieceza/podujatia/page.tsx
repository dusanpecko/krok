import { adminListEvents } from './actions'
import EventsList from '@/components/admin/diocese/EventsList'

export const dynamic = 'force-dynamic'

export default async function EventsAdminPage() {
  return <EventsList events={await adminListEvents()} />
}
