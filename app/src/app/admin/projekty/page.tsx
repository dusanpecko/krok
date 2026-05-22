'use client'

import { useState, useEffect } from 'react'
import { Plus, Home, ChevronRight, Settings } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { upsertProject, deleteProject } from './actions'
import ProjectTable from '@/components/admin/projects/ProjectTable'
import ProjectDialog from '@/components/admin/projects/ProjectDialog'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<any | null>(null)

  const supabase = createClient()

  async function fetchProjects() {
    setLoading(true)
    const { data: projectsData, error } = await supabase
      .from('projects')
      .select('*, donor_projects(donor_id)')
      .order('name')

    if (!error) {
      const formatted = projectsData.map(p => ({
        ...p,
        donors_count: p.donor_projects?.length || 0
      }))
      setProjects(formatted)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleEdit = (project: any) => {
    setEditingProject(project)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Naozaj chcete zmazať tento projekt?')) {
      const result = await deleteProject(id)
      if (result.success) {
        fetchProjects()
      } else {
        alert(result.error)
      }
    }
  }

  const handleSave = async (data: any) => {
    const result = await upsertProject(data)
    if (result.success) {
      fetchProjects()
    }
    return result
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link href="/admin" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <div className="flex items-center gap-1">
          <Settings size={12} /> Nastavenia
        </div>
        <ChevronRight size={12} />
        <span className="text-gray-900">Projekty</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Projekty a fondy</h1>
          <p className="text-gray-500 mt-1">Správa podporovaných projektov, charít a fondových výziev</p>
        </div>

        <button
          onClick={() => { setEditingProject(null); setIsDialogOpen(true) }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Pridať projekt
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <ProjectTable
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isDialogOpen && (
        <ProjectDialog
          project={editingProject}
          onSave={handleSave}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  )
}
