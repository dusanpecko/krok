import { createClient } from '@/lib/supabase/server'
import DonorTable from '@/components/admin/donors/DonorTable'
import DonorFilters from '@/components/admin/donors/DonorFilters'
import { Users, UserCheck, UserPlus, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { sanitizeSearchTerm } from '@/lib/search'

interface DarcoviaPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    parish?: string
    project?: string
    page?: string
    from?: string
    to?: string
    selected?: string
    ids?: string
    sortBy?: string
    sortOrder?: string
  }>
}

export default async function DarcoviaPage({ searchParams }: DarcoviaPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  
  const query = params.q || ''
  const statusFilter = params.status || 'all'
  const parishFilter = params.parish || 'all'
  const projectFilter = params.project || 'all'
  const dateFrom = params.from || ''
  const dateTo = params.to || ''
  const selectedFilter = params.selected || 'all'
  const selectedIdsStr = params.ids || ''
  const selectedIds = selectedIdsStr ? selectedIdsStr.split(',') : []
  const sortBy = params.sortBy || 'last_name'
  const sortOrder = params.sortOrder || 'asc'
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
      donations${(dateFrom || dateTo) ? '!inner' : ''} ( amount, donation_date )
    `, { count: 'exact' })

  // Filters
  if (query) {
    const s = sanitizeSearchTerm(query)
    if (s) {
      donorsQuery = donorsQuery.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,variable_symbol.ilike.%${s}%`)
    }
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

  if (dateFrom) {
    donorsQuery = donorsQuery.gte('donations.donation_date', dateFrom)
  }

  if (dateTo) {
    donorsQuery = donorsQuery.lte('donations.donation_date', dateTo)
  }

  // 2.1 Selection Filter
  if (selectedFilter === 'marked') {
    if (selectedIds.length > 0) {
      donorsQuery = donorsQuery.in('id', selectedIds)
    } else {
      // Return empty set if marked is chosen but no IDs are selected
      donorsQuery = donorsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  } else if (selectedFilter === 'unmarked') {
    if (selectedIds.length > 0) {
      donorsQuery = donorsQuery.not('id', 'in', `(${selectedIds.join(',')})`)
    }
  }

  // 2.2 Sorting
  const isAscending = sortOrder === 'asc'
  if (sortBy === 'variable_symbol') {
    donorsQuery = donorsQuery.order('variable_symbol', { ascending: isAscending, nullsFirst: false })
  } else if (sortBy === 'status') {
    donorsQuery = donorsQuery.order('status', { ascending: isAscending })
  } else if (sortBy === 'email') {
    donorsQuery = donorsQuery.order('email', { ascending: isAscending })
  } else if (sortBy === 'total_donated') {
    // Handled in memory later, no order applied to Supabase query
  } else {
    // Default sorting is by last_name and then first_name for tie breaks
    donorsQuery = donorsQuery.order('last_name', { ascending: isAscending }).order('first_name', { ascending: isAscending })
  }

  // Pagination & Execution
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const isTotalDonatedSort = sortBy === 'total_donated'
  let rawDonors, count, error
  
  if (isTotalDonatedSort) {
    // Fetch all filtered records to sort them in memory before slicing
    const res = await donorsQuery
    rawDonors = res.data
    error = res.error
    count = rawDonors?.length || 0
  } else {
    // Normal database sorting & pagination
    const res = await donorsQuery.range(from, to)
    rawDonors = res.data
    count = res.count
    error = res.error
  }

  // 3. Post-process to calculate totals
  let donors = rawDonors?.map((d: any) => ({
    ...d,
    total_donated: d.donations?.reduce((sum: number, don: any) => sum + (don.amount || 0), 0) || 0
  })) || []

  // 3.1 Apply in-memory sorting and pagination if total_donated sorting is selected
  if (isTotalDonatedSort) {
    donors.sort((a: any, b: any) => {
      const valA = a.total_donated
      const valB = b.total_donated
      return isAscending ? valA - valB : valB - valA
    })
    // Slice only the records for the current page
    donors = donors.slice(from, from + pageSize)
  }

  // 4. Stats
  const { count: totalCount } = await supabase.from('donors').select('*', { count: 'exact', head: true })
  const { count: activeCount } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('status', 'active')

  const totalPages = Math.ceil((count || 0) / pageSize)

  const createPageUrl = (pageNumber: number) => {
    const newParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        newParams.set(key, String(value))
      }
    })
    newParams.set('page', String(pageNumber))
    return `/admin/darcovia?${newParams.toString()}`
  }

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    const pages: (number | string)[] = []
    pages.push(1)
    
    if (current > 3) {
      pages.push('...')
    }
    
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    if (current < total - 2) {
      pages.push('...')
    }
    
    pages.push(total)
    return pages
  }

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
          
          {/* Pagination Preview (active) */}
          {count && count > pageSize && (
            <div className="flex gap-2">
              {page > 1 ? (
                <Link 
                  href={createPageUrl(page - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </Link>
              ) : (
                <button disabled className="p-1.5 rounded-lg border border-gray-100 text-gray-300 disabled:opacity-50 cursor-not-allowed">
                  <ChevronLeft size={16} />
                </button>
              )}
              {page < totalPages ? (
                <Link 
                  href={createPageUrl(page + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <button disabled className="p-1.5 rounded-lg border border-gray-100 text-gray-300 disabled:opacity-50 cursor-not-allowed">
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        <DonorTable donors={donors || []} />

        {/* Pagination Bar below Table */}
        {count && count > pageSize && (
          <div className="flex items-center justify-between px-4 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm mt-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Zobrazuje sa strana <span className="font-semibold text-gray-900">{page}</span> z{' '}
                  <span className="font-semibold text-gray-900">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                  {/* Previous Button */}
                  {page > 1 ? (
                    <Link
                      href={createPageUrl(page - 1)}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-100 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <span className="sr-only">Predchádzajúca</span>
                      <ChevronLeft size={18} />
                    </Link>
                  ) : (
                    <span className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-100 bg-gray-50 text-sm font-medium text-gray-300 cursor-not-allowed">
                      <ChevronLeft size={18} />
                    </span>
                  )}
                  
                  {/* Page Numbers */}
                  {getPageNumbers(page, totalPages).map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-100 bg-white text-sm font-medium text-gray-500"
                        >
                          ...
                        </span>
                      )
                    }
                    
                    const isCurrent = p === page
                    return (
                      <Link
                        key={`page-${p}`}
                        href={createPageUrl(Number(p))}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-bold transition-all ${
                          isCurrent
                            ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10'
                            : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  })}

                  {/* Next Button */}
                  {page < totalPages ? (
                    <Link
                      href={createPageUrl(page + 1)}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-100 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <span className="sr-only">Nasledujúca</span>
                      <ChevronRight size={18} />
                    </Link>
                  ) : (
                    <span className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-100 bg-gray-50 text-sm font-medium text-gray-300 cursor-not-allowed">
                      <ChevronRight size={18} />
                    </span>
                  )}
                </nav>
              </div>
            </div>
            
            {/* Mobile simplified pagination */}
            <div className="flex sm:hidden justify-between w-full">
              {page > 1 ? (
                <Link
                  href={createPageUrl(page - 1)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-100 text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Predchádzajúca
                </Link>
              ) : (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-100 text-sm font-medium rounded-xl text-gray-300 bg-gray-50 cursor-not-allowed">
                  Predchádzajúca
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={createPageUrl(page + 1)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-100 text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Nasledujúca
                </Link>
              ) : (
                <span className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-100 text-sm font-medium rounded-xl text-gray-300 bg-gray-50 cursor-not-allowed">
                  Nasledujúca
                </span>
              )}
            </div>
          </div>
        )}
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
