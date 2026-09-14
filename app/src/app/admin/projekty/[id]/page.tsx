import { notFound } from 'next/navigation'
import { getParishOptions, getProjectDonations, getProjectForAdmin } from '../actions'
import ProjectForm from '@/components/admin/projects/ProjectForm'

export const dynamic = 'force-dynamic'

interface EditProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params
  const [detail, parishes, donations] = await Promise.all([
    getProjectForAdmin(id),
    getParishOptions(),
    getProjectDonations(id),
  ])

  if (!detail) notFound()

  return <ProjectForm initial={detail} parishes={parishes} donations={donations} />
}
