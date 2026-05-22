import { createClient } from '@/lib/supabase/server'
import DonorForm from '@/components/admin/donors/DonorForm'
import { notFound } from 'next/navigation'
import { updateDonor } from '../actions'
import { ArrowLeft, ChevronRight, Home, Users } from 'lucide-react'
import Link from 'next/link'

interface DonorPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DonorEditPage({ params }: DonorPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // 1. Fetch current donor with projects
  const { data: donor, error } = await supabase
    .from('donors')
    .select(`
      *,
      parishes (
        id,
        name
      ),
      donor_projects (
        project_id
      )
    `)
    .eq('id', id)
    .single()

  if (error || !donor) {
    notFound()
  }

  // 1.1 Fetch Donations for this donor
  const { data: donations } = await supabase
    .from('donations')
    .select(`
      *,
      projects (
        name
      )
    `)
    .eq('donor_id', id)
    .order('donation_date', { ascending: false })

  // 2. Fetch parishes and projects for selection
  const { data: parishes } = await supabase
    .from('parishes')
    .select('id, name')
    .order('name')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  // 3. Define the save action for the form
  const handleSave = async (data: any) => {
    'use server'
    return await updateDonor(id, data)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
        <Link href="/admin" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={14} /> Admin
        </Link>
        <ChevronRight size={14} />
        <Link href="/admin/darcovia" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Users size={14} /> Darcovia
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900">Upraviť darcu</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {donor.first_name} {donor.last_name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
             <span className="text-sm text-gray-400 font-mono">ID: {donor.legacy_id || donor.id.slice(0, 8)}</span>
             <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
             <span className="text-sm font-bold text-blue-600 font-mono">VS: {donor.variable_symbol}</span>
          </div>
        </div>

        <Link 
          href="/admin/darcovia"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
        >
          <ArrowLeft size={18} /> Späť na zoznam
        </Link>
      </div>

      <DonorForm 
        donor={donor} 
        parishes={parishes || []} 
        projects={projects || []}
        donations={donations || []}
        onSave={handleSave} 
      />
    </div>
  )
}
