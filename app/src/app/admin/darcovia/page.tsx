import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DonorTable from '@/components/admin/donors/DonorTable'
import DonorFilters from '@/components/admin/donors/DonorFilters'
import DonorListToolbar from '@/components/admin/donors/DonorListToolbar'
import { fetchDonorList, parseDonorListParams, PAGE_SIZES } from './donor-query'

interface DarcoviaPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function DarcoviaPage({ searchParams }: DarcoviaPageProps) {
  const rawParams = await searchParams
  const params = parseDonorListParams(rawParams)
  const supabase = await createClient()

  const [{ data: parishes }, { data: projects }, { donors, count }, { count: totalCount }, { count: activeCount }] = await Promise.all([
    supabase.from('parishes').select('id, name').order('name'),
    supabase.from('projects').select('id, name').order('name'),
    fetchDonorList(params),
    supabase.from('donors').select('*', { count: 'exact', head: true }),
    supabase.from('donors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const { page, pageSize } = params
  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  const createPageUrl = (pageNumber: number) => {
    const newParams = new URLSearchParams()
    Object.entries(rawParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') newParams.set(key, String(value))
    })
    newParams.set('page', String(pageNumber))
    return `/admin/darcovia?${newParams.toString()}`
  }

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | string)[] = [1]
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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

      <DonorFilters parishes={parishes || []} projects={projects || []} />

      <div className="space-y-4">
        <DonorListToolbar shown={donors.length} total={count} pageSize={pageSize} pageSizes={PAGE_SIZES} />

        <DonorTable donors={donors} />

        {count > pageSize && (
          <div className="flex items-center justify-between px-4 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm mt-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Zobrazuje sa strana <span className="font-semibold text-gray-900">{page}</span> z{' '}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </p>
              <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px items-center gap-1" aria-label="Pagination">
                <PrevNext dir={-1} href={page > 1 ? createPageUrl(page - 1) : null} />
                {getPageNumbers(page, totalPages).map((p, idx) =>
                  p === '...' ? (
                    <span key={`e-${idx}`} className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-400">
                      …
                    </span>
                  ) : (
                    <Link
                      key={`p-${p}`}
                      href={createPageUrl(Number(p))}
                      className={`relative inline-flex items-center px-4 py-2 border rounded-xl text-sm font-bold transition-all ${
                        p === page ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}
                <PrevNext dir={1} href={page < totalPages ? createPageUrl(page + 1) : null} />
              </nav>
            </div>
            <div className="flex sm:hidden justify-between w-full items-center">
              <PrevNext dir={-1} href={page > 1 ? createPageUrl(page - 1) : null} />
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <PrevNext dir={1} href={page < totalPages ? createPageUrl(page + 1) : null} />
            </div>
          </div>
        )}
      </div>

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
        <p className="text-xs text-gray-400 italic font-medium">
          Posledná aktualizácia: dnes o {new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function PrevNext({ dir, href }: { dir: -1 | 1; href: string | null }) {
  const Icon = dir === -1 ? ChevronLeft : ChevronRight
  return href ? (
    <Link href={href} className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors inline-flex">
      <Icon />
    </Link>
  ) : (
    <span className="p-1.5 rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed inline-flex">
      <Icon />
    </span>
  )
}

function ChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
