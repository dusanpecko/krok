import { createClient } from '@/lib/supabase/server'
import DonorForm from '@/components/admin/donors/DonorForm'
import { createDonor, generateNextVS } from '../actions'
import { ChevronRight, Home, Users } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function NewDonorPage() {
  const supabase = await createClient()
  
  // 1. Fetch parishes and projects for selection
  const { data: parishes } = await supabase
    .from('parishes')
    .select('id, name')
    .order('name')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  // 2. Pre-generate next VS for display placeholder (though it will be re-generated on save)
  const nextVS = await generateNextVS()

  // 3. Define the save action
  const handleSave = async (data: any) => {
    'use server'
    const result = await createDonor(data)
    if (result.success && result.id) {
       redirect(`/admin/darcovia/${result.id}`)
    }
    return result
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <span className="text-gray-900">Nový darca</span>
      </nav>

      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pridať nového darcu</h1>
        <p className="text-gray-500 mt-1">Registrácia nového podporovateľa do fondu KROK</p>
      </div>

      <DonorForm 
        parishes={parishes || []} 
        projects={projects || []}
        onSave={handleSave} 
      />
    </div>
  )
}
