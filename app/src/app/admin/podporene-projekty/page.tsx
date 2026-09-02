'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Home, ChevronRight, FolderHeart } from 'lucide-react'
import Link from 'next/link'
import {
  getSupportedProjects,
  upsertSupportedProject,
  deleteSupportedProject,
} from './actions'
import SupportedProjectTable from '@/components/admin/supported-projects/SupportedProjectTable'
import SupportedProjectDialog, {
  SupportedProject,
} from '@/components/admin/supported-projects/SupportedProjectDialog'

export default function SupportedProjectsAdminPage() {
  const [projects, setProjects] = useState<SupportedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<SupportedProject | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    const data = await getSupportedProjects()
    setProjects(data as SupportedProject[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleEdit = (project: SupportedProject) => {
    setEditingProject(project)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Naozaj chcete zmazať tento podporený projekt?')) {
      const result = await deleteSupportedProject(id)
      if (result.success) {
        fetchProjects()
      } else {
        alert(result.error)
      }
    }
  }

  const handleSave = async (data: any) => {
    const result = await upsertSupportedProject(data)
    if (result.success) {
      fetchProjects()
    }
    return result
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link
          href="/admin"
          className="hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <div className="flex items-center gap-1">
          <FolderHeart size={12} /> <span className="text-gray-900">Podporené projekty</span>
        </div>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Podporené projekty
          </h1>
          <p className="text-gray-500 mt-1">
            Správa verejnej prezentácie podporených projektov podľa rokov
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProject(null)
            setIsDialogOpen(true)
          }}
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
        <SupportedProjectTable
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isDialogOpen && (
        <SupportedProjectDialog
          project={editingProject}
          onSave={handleSave}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  )
}
