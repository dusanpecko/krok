import { createClient } from '@/lib/supabase/server'
import DonorTable from '@/components/admin/donors/DonorTable'
import DonorFilters from '@/components/admin/donors/DonorFilters'
import { Users, UserCheck, UserPlus, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface DarcoviaPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    parish?: string
    project?: string
    page?: string
  }>
}

export default async function DarcoviaPage({ searchParams }: DarcoviaPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  
  const query = params.q || ''
  const statusFilter = params.status || 'all'
  const parishFilter = params.parish || 'all'
  const projectFilter = params.project || 'all'
  const page = parseInt(params.page || '1')
  const pageSize = 20
  
  // 1. Fetch Parishes and Projects for filters
  const [{ data: parishes }, { data: projects }] = await Promise.all([
    supabase.from('parishes').select('id, name').order('name'),
    supabase.from('projects').select('id, name').order('name')
  ])

  // 2. Build Donors Query
  // We use type assertion to any to bypass the complex inferred types when chaining conditionally,
  // since dynamic or conditionally branched selects confuse Supabase's generated TS bindings.
  let donorsQuery: any = supabase
    .from('donors')
    .select(`
      *,
      parishes ( name ),
      donor_projects${projectFilter !== 'all' ? '!inner' : ''} ( project_id ),
      donations ( amount )
    `, { count: 'exact' })

  // Filters
  if (query) {
    donorsQuery = donorsQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,variable_symbol.ilike.%${query}%`)
  }
  
  if (statusFilter !== 'all') {
    donorsQuery = donorsQuery.eq('status', statusFilter)
  }
  
  if (parishFilter !== 'all') {
    donorsQuery = donorsQuery.eq('parish_id', parishFilter)
  }

  if (projectFilter !== 'all') {
    donorsQuery = donorsQuery.eq('donor_projects.project_id', projectFilter)
  }

  // Pagination & Sorting
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const { data: rawDonors, count, error } = await donorsQuery
    .order('last_name', { ascending: true })
    .range(from, to)

  // 3. Post-process to calculate totals
  const donors = rawDonors?.map((d: any) => ({
    ...d,
    total_donated: d.donations?.reduce((sum: number, don: any) => sum + (don.amount || 0), 0) || 0
  })) || []

  // 4. Stats
  const { count: totalCount } = await supabase.from('donors').select('*', { count: 'exact', head: true })
  const { count: activeCount } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('status', 'active')

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Darcovia</h1>
          <p className="text-gray-500 mt-1">Správa a evidencia donátorov fondu KROK</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-600/20 flex flex-col justify-center min-w-[140px]">
            <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Spolu darcov</span>
            <span className="text-2xl font-black">{totalCount || 0}</span>
          </div>
          <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col justify-center min-w-[140px]">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Aktívni</span>
            <span className="text-2xl font-black text-green-600">{activeCount || 0}</span>
          </div>
          <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-lg hidden sm:flex flex-col justify-center min-w-[140px]">
             <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Tento mesiac</span>
             <div className="flex items-center gap-1.5 mt-0.5">
                <TrendingUp size={14} className="text-green-400" />
                <span className="text-xl font-bold">+12</span>
             </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <DonorFilters parishes={parishes || []} projects={projects || []} />

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500 font-medium font-mono">
            Zobrazené: <span className="text-gray-900">{donors?.length || 0}</span> z <span className="text-gray-900">{count || 0}</span> výsledkov
          </p>
          
          {/* Pagination Preview (simplified) */}
          {count && count > pageSize && (
            <div className="flex gap-2">
              <button disabled className="p-1.5 rounded-lg border border-gray-100 text-gray-300 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <button disabled className="p-1.5 rounded-lg border border-gray-100 text-gray-300 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <DonorTable donors={donors || []} />
      </div>

      {/* Footer Info (similar to FileMaker screenshot) */}
      <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-gray-100 gap-4">
        <div className="flex gap-8">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Celkový počet darcov</p>
              <p className="text-lg font-black text-gray-900">{totalCount || 0}</p>
           </div>
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aktívnych darcov</p>
              <p className="text-lg font-black text-blue-600">{activeCount || 0}</p>
           </div>
        </div>
        
        <div className="text-right">
           <p className="text-xs text-gray-400 italic font-medium">Posledná aktualizácia: dnes o {new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  )
}

function ChevronLeft(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6"/>
    </svg>
  )
}

function ChevronRight(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}
