import Link from 'next/link'
import { Plus, Megaphone } from 'lucide-react'
import { getProjectsForAdmin } from './actions'
import ProjectTable from '@/components/admin/projects/ProjectTable'

export const dynamic = 'force-dynamic'

export default async function ProjectsAdminPage() {
  const projects = await getProjectsForAdmin()

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-blue-600" />
            Výzvy a projekty
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Výzvy na podporu zobrazené na webe (dary cez Mollie a prevodom) aj interné fondy pre párovanie platieb.
          </p>
        </div>
        <Link
          href="/admin/projekty/novy"
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nová výzva
        </Link>
      </div>

      <ProjectTable projects={projects} />
    </div>
  )
}
