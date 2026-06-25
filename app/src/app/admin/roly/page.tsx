'use client'

import { useState, useEffect } from 'react'
import { getUsersWithRoles, toggleUserRole, getAvailableRoles } from './actions'
import { 
  Users, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  X,
  Shield
} from 'lucide-react'
import Link from 'next/link'

export default function AdminRolesPage() {
  const [users, setUsers] = useState<any[]>([])
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedUser = selectedUserId ? users.find(u => u.userId === selectedUserId) : null

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getUsersWithRoles()
      setUsers(data)
      
      const rolesData = await getAvailableRoles()
      setAvailableRoles(rolesData)
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

  const handleRoleToggle = async (userId: string, role: string, currentActive: boolean, userName: string) => {
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <Link 
          href="/admin/roly" 
          className="px-6 py-3 text-xs font-bold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2"
        >
          <Users size={14} />
          Používatelia
        </Link>
        <Link 
          href="/admin/roly/opravnenia" 
          className="px-6 py-3 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2"
        >
          <Shield size={14} />
          Matica oprávnení
        </Link>
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
                  <th className="px-5 py-3 text-center">Priradenie oprávnení</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredUsers.map(user => {
                  const isAdminRole = user.roles.includes('administrator')

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
                              const matchedRole = availableRoles.find((role: any) => role.id === r)
                              const label = matchedRole ? matchedRole.name : r
                              
                              let color = 'bg-gray-50 text-gray-600 border border-gray-200'
                              if (r === 'administrator') {
                                color = 'bg-red-50 text-red-700 border border-red-200'
                              } else if (r === 'kontrolor') {
                                color = 'bg-purple-50 text-purple-700 border border-purple-200'
                              } else if (r === 'zadavatel') {
                                color = 'bg-blue-50 text-blue-700 border border-blue-200'
                              } else if (r === 'farnost') {
                                color = 'bg-green-50 text-green-700 border border-green-200'
                              } else if (r === 'zamestnanec') {
                                color = 'bg-amber-50 text-amber-700 border border-amber-200'
                              } else if (r === 'kuria') {
                                color = 'bg-indigo-50 text-indigo-700 border border-indigo-200'
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
                      
                      {/* Spravovať roly button */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setSelectedUserId(user.userId)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                        >
                          <Users size={12} className="text-gray-400" />
                          Spravovať roly
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal na priradenie oprávnení */}
      {selectedUser && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Priradenie oprávnení
                </h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  {selectedUser.name} ({selectedUser.vs})
                </p>
              </div>
              <button 
                onClick={() => setSelectedUserId(null)} 
                className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100 shadow-sm cursor-pointer"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                Zvoľte roly pre tohto používateľa
              </p>
              
              <div className="space-y-2">
                {availableRoles.map((role: any) => {
                  const isActive = selectedUser.roles.includes(role.id)
                  const isUpdating = updatingUserId === `${selectedUser.userId}-${role.id}`
                  
                  return (
                    <button
                      key={role.id}
                      onClick={() => handleRoleToggle(selectedUser.userId, role.id, isActive, selectedUser.name)}
                      disabled={isUpdating}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-50/55 border-blue-200 text-blue-800' 
                          : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold">{role.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium font-sans leading-normal">
                          {role.description || 'Bez popisu'}
                        </span>
                      </div>
                      
                      <div className="shrink-0 ml-3">
                        {isUpdating ? (
                          <Loader2 size={16} className="animate-spin text-blue-600" />
                        ) : isActive ? (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 border border-gray-300 rounded-full" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="py-2.5 px-6 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs hover:bg-gray-300 transition-all cursor-pointer"
              >
                Hotovo / Zatvoriť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
