import { getParishOptions } from '../actions'
import ProjectForm from '@/components/admin/projects/ProjectForm'

export const dynamic = 'force-dynamic'

export default async function NewProjectPage() {
  const parishes = await getParishOptions()
  return <ProjectForm parishes={parishes} />
}
