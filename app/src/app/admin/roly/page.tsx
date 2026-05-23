'use client'

import { useState, useEffect } from 'react'
import { getUsersWithRoles, toggleUserRole } from './actions'
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Undo
} from 'lucide-react'
import Link from 'next/link'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  darkBlue: '#002D72',
}

export default function AdminRolesPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getUsersWithRoles()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Nepodarilo sa načítať zoznam používateľov.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleRoleToggle = async (userId: string, role: 'administrator' | 'kontrolor', currentActive: boolean, userName: string) => {
    setUpdatingUserId(`${userId}-${role}`)
    setError(null)
    setSuccess(null)

    try {
      const res = await toggleUserRole({
        userId,
        role,
        active: !currentActive,
        userName
      })

      if (res.success) {
        setSuccess(`Práva používateľa ${userName} boli úspešne zmenené.`)
        // Obnoviť lokálny zoznam
        const updatedUsers = await getUsersWithRoles()
        setUsers(updatedUsers)
      } else {
        setError(res.error || 'Nepodarilo sa zmeniť rolu.')
      }
    } catch (err) {
      setError('Nastala neočakávaná chyba pri komunikácii so serverom.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Filtrovanie používateľov podľa vyhľadávania
  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.vs.includes(term)
    )
  })

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Načítavam registrovaných používateľov...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Správa Používateľských Rolí a Oprávnení
        </h1>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
          Administrácia Pastoračného Fondu KROK – Prístupové práva
        </p>
      </div>

      {/* Info Banner o dedení práv */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100/50 rounded-xl flex items-center justify-center text-blue-700 shrink-0">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Dôležité informácie o dedičnosti rolí:</h4>
          <p className="text-xs text-blue-800/80 leading-relaxed font-medium">
            Rola <b>Administrátor</b> automaticky zahŕňa všetky práva <b>Kontrolóra</b>. 
            Používateľovi s rolou Administrátor nemusíte separátne priraďovať rolu Kontrolór – po priradení do hodnotiacej komisie môže priamo hodnotiť pridelené projekty a písať odborné posudky na <Link href="/kontrolor/dashboard" className="underline font-bold hover:text-blue-900">dashboarde kontrolóra</Link>.
          </p>
        </div>
      </div>

      {/* Notifikácie */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-150 flex items-center gap-3 text-xs font-semibold text-red-700 animate-in fade-in">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-150 flex items-center gap-3 text-xs font-semibold text-green-700 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Panel s filtrami a vyhľadávaním */}
      <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hľadať používateľa podľa mena, e-mailu, alebo VS..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase shrink-0">
          Celkovo s kontom: <b>{filteredUsers.length} používateľov</b>
        </div>
      </div>

      {/* Tabuľka s používateľmi */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-xs italic">Nenašli sa žiadni registrovaní používatelia.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Používateľ (Meno / VS)</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3">Aktívne roly</th>
                  <th className="px-5 py-3 text-center">Udelenie role: KONTROLÓR</th>
                  <th className="px-5 py-3 text-center">Udelenie role: ADMINISTRÁTOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredUsers.map(user => {
                  const isAdminRole = user.roles.includes('administrator')
                  const isEvaluatorRole = user.roles.includes('kontrolor')
                  const isSubmitterRole = user.roles.includes('zadavatel')

                  return (
                    <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <span className="font-extrabold text-gray-900 block">{user.name}</span>
                          <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                            Variabilný symbol: <b>{user.vs}</b>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 font-medium">
                        {user.email}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-gray-150 text-gray-500">
                              Darca (Bez roly)
                            </span>
                          ) : (
                            user.roles.map((r: string) => {
                              let label = r
                              let color = 'bg-gray-100 text-gray-700'
                              if (r === 'administrator') {
                                label = 'Administrátor'
                                color = 'bg-red-50 text-red-700 border border-red-200'
                              } else if (r === 'kontrolor') {
                                label = 'Kontrolór'
                                color = 'bg-purple-50 text-purple-700 border border-purple-200'
                              } else if (r === 'zadavatel') {
                                label = 'Žiadateľ'
                                color = 'bg-blue-50 text-blue-700 border border-blue-200'
                              }

                              return (
                                <span key={r} className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${color}`}>
                                  {label}
                                </span>
                              )
                            })
                          )}
                        </div>
                      </td>
                      
                      {/* Kontrolór Toggle */}
                      <td className="px-5 py-4 text-center">
                        {updatingUserId === `${user.userId}-kontrolor` ? (
                          <Loader2 size={16} className="animate-spin text-blue-600 mx-auto" />
                        ) : (
                          <button
                            onClick={() => handleRoleToggle(user.userId, 'kontrolor', isEvaluatorRole, user.name)}
                            disabled={isAdminRole} // Ak je admin, rola kontrolora je irelevantná
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                              isAdminRole 
                                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                                : isEvaluatorRole
                                  ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                            title={isAdminRole ? 'Administrátor má rolu kontrolóra automaticky' : undefined}
                          >
                            <UserCheck size={12} />
                            {isAdminRole ? 'Dedená (Admin)' : isEvaluatorRole ? 'Odobrať rolu' : 'Udeliť rolu'}
                          </button>
                        )}
                      </td>

                      {/* Administrátor Toggle */}
                      <td className="px-5 py-4 text-center">
                        {updatingUserId === `${user.userId}-administrator` ? (
                          <Loader2 size={16} className="animate-spin text-blue-600 mx-auto" />
                        ) : (
                          <button
                            onClick={() => handleRoleToggle(user.userId, 'administrator', isAdminRole, user.name)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                              isAdminRole
                                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {isAdminRole ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                            {isAdminRole ? 'Odobrať prístup' : 'Udeliť prístup'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
