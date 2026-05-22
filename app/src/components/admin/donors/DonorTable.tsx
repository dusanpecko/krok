'use client'

import { 
  Mail, Phone, MapPin, ExternalLink, MoreVertical, 
  ShieldCheck, ShieldAlert, Pencil, Trash2, 
  UserCog, CreditCard, UserX, UserCheck, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { toggleDonorStatus } from '@/app/admin/darcovia/actions'
import { useRouter } from 'next/navigation'

interface Donor {
  id: string
  legacy_id: string | null
  variable_symbol: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  city: string | null
  status: 'active' | 'inactive' | 'suspended'
  total_donated?: number
  parishes?: {
    name: string
  } | null
}

interface DonorTableProps {
  donors: Donor[]
  loading?: boolean
}

export default function DonorTable({ donors, loading }: DonorTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const router = useRouter()
  const currentYear = new Date().getFullYear()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openMenuId])

  const handleToggleStatus = async (donor: Donor) => {
    setIsUpdating(donor.id)
    const res = await toggleDonorStatus(donor.id, donor.status)
    if (!res.success) {
      alert(res.error)
    }
    setIsUpdating(null)
    setOpenMenuId(null)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-50 border-b border-gray-100" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white border-b border-gray-50 last:border-0" />
          ))}
        </div>
      </div>
    )
  }

  if (donors.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm py-20 text-center">
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Nenašli sa žiadni darcovia</h3>
        <p className="text-gray-500 max-w-sm mx-auto mt-2">
          Skúste upraviť filtre alebo vyhľadávanie pre zobrazenie výsledkov.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">ID / VS</th>
              <th className="px-6 py-4 font-semibold text-gray-900">Meno a priezvisko</th>
              <th className="px-6 py-4 font-semibold text-gray-900">Kontakt</th>
              <th className="px-6 py-4 font-semibold text-gray-900">Dary spolu</th>
              <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {donors.map((donor) => (
              <tr key={donor.id} className="hover:bg-gray-50/70 transition-colors group cursor-pointer relative">
                <td className="px-6 py-4">
                  <div className="space-y-0.5">
                    {donor.legacy_id && (
                      <div className="text-xs text-gray-400 font-mono">#{donor.legacy_id}</div>
                    )}
                    <div className="text-sm font-bold text-blue-600 font-mono tracking-tight">
                      {donor.variable_symbol || '—'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Link href={`/admin/darcovia/${donor.id}`} className="block">
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {donor.first_name} {donor.last_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {donor.parishes?.name || 'Bez farnosti'}
                    </p>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {donor.email ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Mail size={12} className="text-gray-400" />
                        <span className="text-xs truncate max-w-[150px]">{donor.email}</span>
                      </div>
                    ) : null}
                    {donor.phone ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone size={12} className="text-gray-400" />
                        <span className="text-xs">{donor.phone}</span>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={`text-sm font-black ${donor.total_donated && donor.total_donated > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {donor.total_donated?.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
                    </span>
                    {donor.city && (
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">
                        {donor.city}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {isUpdating === donor.id ? (
                      <Loader2 size={14} className="animate-spin text-blue-500" />
                    ) : donor.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-100">
                        Aktívny
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-200">
                        Neaktívny
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right relative">
                  <div className="flex justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === donor.id ? null : donor.id)
                      }}
                      className={`p-2 rounded-lg transition-all ${openMenuId === donor.id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {openMenuId === donor.id && (
                    <div 
                      className="absolute right-6 top-14 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link 
                        href={`/admin/darcovia/${donor.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-xl group"
                      >
                        <UserCog size={16} className="text-gray-400 group-hover:text-blue-500" />
                        <span className="font-bold">Upraviť donátora</span>
                      </Link>

                      <button
                        onClick={() => handleToggleStatus(donor)}
                        className="w-[calc(100%-16px)] flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors mx-2 rounded-xl group text-left"
                      >
                        {donor.status === 'active' ? (
                          <>
                            <UserX size={16} className="text-gray-400 group-hover:text-orange-500" />
                            <span className="font-bold">Nastaviť ako neaktívny</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={16} className="text-gray-400 group-hover:text-green-500" />
                            <span className="font-bold">Nastaviť ako aktívny</span>
                          </>
                        )}
                      </button>

                      <Link 
                        href={`/admin/banka?q=${donor.variable_symbol}&year=${currentYear}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors mx-2 rounded-xl group"
                      >
                        <CreditCard size={16} className="text-gray-400 group-hover:text-green-500" />
                        <span className="font-bold">Zobraziť platby ({currentYear})</span>
                      </Link>

                      <div className="h-px bg-gray-100 my-1 mx-4" />

                      <button
                        onClick={() => alert('Mazanie donátorov zatiaľ nie je dostupné.')}
                        className="w-[calc(100%-16px)] flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors mx-2 rounded-xl group text-left opacity-50 cursor-not-allowed"
                      >
                        <Trash2 size={16} className="text-red-300 group-hover:text-red-500" />
                        <span className="font-bold">Vymazať donátora</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Users(props: any) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
