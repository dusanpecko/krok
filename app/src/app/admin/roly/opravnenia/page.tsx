'use client'

import { useState, useEffect } from 'react'
import { getPermissions, getRolePermissions, getRoles, toggleRolePermission } from './actions'
import { 
  Users, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Key,
  Shield
} from 'lucide-react'
import Link from 'next/link'

export default function PermissionsMatrixPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null) // roleId-permissionId
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [rData, pData, rpData] = await Promise.all([
        getRoles(),
        getPermissions(),
        getRolePermissions()
      ])
      setRoles(rData)
      setPermissions(pData)
      setRolePermissions(rpData)
    } catch (err) {
      console.error('Failed to load permissions matrix:', err)
      setError('Nepodarilo sa načítať dáta pre maticu oprávnení.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const isPermissionAssigned = (roleId: string, permissionId: string) => {
    // Administrátor má vždy všetky oprávnenia
    if (roleId === 'administrator') return true
    
    return rolePermissions.some(
      rp => rp.role_id === roleId && rp.permission_id === permissionId
    )
  }

  const handleToggle = async (roleId: string, permissionId: string, isCurrentlyActive: boolean) => {
    // Administrátorovi nemožno brať práva v matici (prevencia lockoutu)
    if (roleId === 'administrator') return

    const key = `${roleId}-${permissionId}`
    setUpdatingKey(key)
    setError(null)
    setSuccess(null)

    try {
      const res = await toggleRolePermission({
        roleId,
        permissionId,
        active: !isCurrentlyActive
      })

      if (res.success) {
        setSuccess(`Oprávnenie úspešne zmenené.`)
        // Aktualizovať lokálny stav
        if (isCurrentlyActive) {
          setRolePermissions(prev => prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === permissionId)))
        } else {
          setRolePermissions(prev => [...prev, { role_id: roleId, permission_id: permissionId }])
        }
      } else {
        setError(res.error || 'Nepodarilo sa zmeniť oprávnenie.')
      }
    } catch (err) {
      setError('Nastala neočakávaná chyba pri komunikácii so serverom.')
    } finally {
      setUpdatingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Načítavam maticu oprávnení...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Matica Oprávnení a Rolí
        </h1>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
          Administrácia Pastoračného Fondu KROK – Prístupové práva
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <Link 
          href="/admin/roly" 
          className="px-6 py-3 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2"
        >
          <Users size={14} />
          Používatelia
        </Link>
        <Link 
          href="/admin/roly/opravnenia" 
          className="px-6 py-3 text-xs font-bold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2"
        >
          <Shield size={14} />
          Matica oprávnení
        </Link>
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

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4 w-1/3">Oprávnenie (Akcia / Sekcia)</th>
                {roles.map(role => (
                  <th key={role.id} className="px-4 py-4 text-center">
                    <div>
                      <span className="text-gray-900 block font-extrabold">{role.name}</span>
                      <span className="text-[9px] text-gray-400 font-medium font-mono uppercase mt-0.5 block">
                        {role.id}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {permissions.map(perm => (
                <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-gray-900 block flex items-center gap-1.5">
                        <Key size={12} className="text-blue-500" />
                        {perm.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium font-sans leading-normal block">
                        {perm.description || 'Bez popisu'}
                      </span>
                    </div>
                  </td>
                  
                  {roles.map(role => {
                    const isActive = isPermissionAssigned(role.id, perm.id)
                    const isUpdating = updatingKey === `${role.id}-${perm.id}`
                    const isAdministrator = role.id === 'administrator'

                    return (
                      <td key={role.id} className="px-4 py-4 text-center">
                        <div className="flex justify-center items-center">
                          {isAdministrator ? (
                            <div 
                              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200"
                              title="Administrátor má automaticky všetky oprávnenia"
                            >
                              <Lock size={12} />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggle(role.id, perm.id, isActive)}
                              disabled={isUpdating}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                                isUpdating
                                  ? 'bg-gray-50 border-gray-200'
                                  : isActive
                                    ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100/70'
                                    : 'bg-white border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-500'
                              }`}
                            >
                              {isUpdating ? (
                                <Loader2 size={12} className="animate-spin text-blue-600" />
                              ) : isActive ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                              ) : (
                                <div className="w-1.5 h-1.5 bg-transparent rounded-full" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
