import { adminListDocuments } from '../actions'
import DocumentsAdmin from '@/components/admin/diocese/DocumentsAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export default async function DocumentsAdminPage() {
  return <DocumentsAdmin docs={await adminListDocuments()} />
}
