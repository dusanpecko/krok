import { getBankYears, getTransactions, getProjects } from './actions'
import BankDashboard from '@/components/admin/banka/BankDashboard'

interface BankPageProps {
  searchParams: Promise<{
    year?: string
    month?: string
    status?: string
    q?: string
    page?: string
  }>
}

export default async function BankaPage({ searchParams }: BankPageProps) {
  const params = await searchParams
  
  // Načítaj dostupné roky pre karty (taby)
  const years = await getBankYears()

  // Surové parametre s fallbackom
  const currentYear = params.year ? parseInt(params.year) : years[0]
  const currentMonth = params.month ? parseInt(params.month) : ('all' as const)
  const currentStatus = (params.status || 'all') as 'all' | 'matched' | 'unmatched'
  const currentQuery = params.q || ''
  const currentPage = parseInt(params.page || '1')

  // Získaj bankové transakcie a zoznam projektov na párovanie
  const [txData, projects] = await Promise.all([
    getTransactions({
      year: currentYear,
      month: currentMonth === 'all' ? 'all' : currentMonth,
      status: currentStatus,
      search: currentQuery,
      page: currentPage
    }),
    getProjects()
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bankové transakcie</h1>
          <p className="text-gray-500 mt-1">
            Prehľad importovaných pohybov podľa rokov. Transakcie svietiace <span className="font-bold text-red-600 px-1 italic">načerveno</span> je nutné manuálne spárovať.
          </p>
        </div>
      </div>

      <BankDashboard 
        years={years}
        projects={projects}
        initialData={txData.data}
        totalCount={txData.count}
        totalPages={txData.totalPages}
        
        currentYear={currentYear}
        currentMonth={currentMonth}
        currentStatus={currentStatus}
        currentQuery={currentQuery}
        currentPage={currentPage}
      />
    </div>
  )
}
