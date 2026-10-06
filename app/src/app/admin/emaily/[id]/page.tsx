import { notFound } from 'next/navigation'
import { getEmailTemplate, getRecentEmailLogs } from '../actions'
import EmailTemplateEditor from '@/components/admin/emails/EmailTemplateEditor'

export const dynamic = 'force-dynamic'

interface EditEmailTemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function EditEmailTemplatePage({ params }: EditEmailTemplatePageProps) {
  const { id } = await params
  const template = await getEmailTemplate(id)
  if (!template) notFound()
  const logs = await getRecentEmailLogs(template.template_key)

  return <EmailTemplateEditor initial={template} logs={logs} />
}
