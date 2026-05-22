'use client'

import { useState } from 'react'
import { 
  User, History, Heart, Save, AlertCircle, 
  CheckCircle2, CreditCard, Mail, Phone, MapPin, 
  ChevronRight, Landmark, ArrowRight
} from 'lucide-react'
import { updateProfile } from '@/app/(public)/profil/actions'
import { motion, AnimatePresence } from 'framer-motion'

interface ProfileContentProps {
  donor: any
  donations: any[]
}

type Tab = 'data' | 'donations' | 'support'

export default function ProfileContent({ donor, donations }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>('data')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({
    first_name: donor.first_name || '',
    last_name: donor.last_name || '',
    phone: donor.phone || '',
    street: donor.street || '',
    city: donor.city || '',
    postal_code: donor.postal_code || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const res = await updateProfile(formData)
    if (res.success) {
      setMessage({ type: 'success', text: 'Vaše údaje boli úspešne aktualizované.' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Nastala chyba.' })
    }
    setLoading(false)
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'data', label: 'Moje údaje', icon: User },
    { id: 'donations', label: 'Moje dary', icon: History },
    { id: 'support', label: 'Podporiť', icon: Heart },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-600/20">
            {donor.first_name?.[0]}{donor.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {donor.first_name} {donor.last_name}
            </h1>
            <p className="text-sm text-gray-400 font-medium flex items-center gap-2 mt-1">
              <Mail size={14} /> {donor.email}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Variabilný symbol</span>
          <span className="text-2xl font-mono font-black text-blue-600">{donor.variable_symbol}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl w-max shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300
              ${activeTab === tab.id 
                ? 'bg-white text-blue-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800'}
            `}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'data' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleUpdate} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <User size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Osobné informácie</h3>
                    </div>

                    {message && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                        message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="text-sm font-medium">{message.text}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Meno</label>
                        <input name="first_name" value={formData.first_name} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Priezvisko</label>
                        <input name="last_name" value={formData.last_name} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Telefón</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                          <MapPin size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Kontaktná adresa</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Ulica a číslo</label>
                          <input name="street" value={formData.street} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Mesto</label>
                          <input name="city" value={formData.city} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">PSČ</label>
                          <input name="postal_code" value={formData.postal_code} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                      Uložiť zmeny
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl space-y-6">
                  <h3 className="text-lg font-black uppercase tracking-wider border-l-4 border-white/30 pl-4">Zhrnutie darcu</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-blue-100/70 text-sm">Registrovaný od</span>
                      <span className="font-bold">
                        {donor.registered_at ? new Date(donor.registered_at).toLocaleDateString() : 
                         donor.created_at ? new Date(donor.created_at).toLocaleDateString() : 'Neznáme'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-blue-100/70 text-sm">Farnosť</span>
                      <span className="font-bold">{donor.parishes?.name || 'Všeobecná'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-blue-100/70 text-sm">Status</span>
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase">
                        {donor.status === 'active' ? 'Aktívny' : 'Neaktívny'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'donations' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">História príspevkov</h3>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spolu darované</p>
                   <p className="text-2xl font-black text-green-600">
                     {donations.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                   </p>
                </div>
              </div>

              {donations.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl">
                   <Landmark size={48} className="mx-auto text-gray-300 mb-4" />
                   <p className="text-gray-500 font-bold">Zatiaľ ste neposlali žiadne príspevky.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {donations.map((donation) => (
                     <div key={donation.id} className="flex items-center justify-between p-6 bg-gray-50/50 hover:bg-white hover:shadow-md border border-gray-50 hover:border-blue-100 rounded-2xl transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                              <Landmark size={20} />
                           </div>
                           <div>
                              <p className="text-sm font-black text-gray-900">
                                {donation.projects?.name || 'Všeobecný dar'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(donation.donation_date).toLocaleDateString('sk-SK')}
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-black text-green-600">+{donation.amount.toFixed(2)} €</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase">{donation.payment_method === 'bank_transfer' ? 'Prevod' : 'Hotovosť'}</p>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="max-w-3xl mx-auto space-y-8 py-10">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                     <Heart size={40} fill="currentColor" />
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">Chcem podporiť</h2>
                  <p className="text-gray-500 max-w-lg mx-auto">
                    Vaša pomoc nám umožňuje rásť a pomáhať tam, kde je to najviac potrebné. Vyberte si spôsob podpory.
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-blue-600">
                     <CreditCard size={32} className="text-blue-600 mb-6" />
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Jednorazový dar</h3>
                     <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        Podporte nás jednorazovým príspevkom cez platobnú bránu alebo prevodom.
                     </p>
                     <button className="flex items-center gap-2 text-blue-600 font-bold group-hover:gap-4 transition-all">
                        Pokračovať k daru <ArrowRight size={18} />
                     </button>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-orange-500">
                     <History size={32} className="text-orange-500 mb-6" />
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Pravidelný dar</h3>
                     <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        Nastavte si trvalý príkaz a pomáhajte nám dlhodobo a predvídateľne.
                     </p>
                     <button className="flex items-center gap-2 text-orange-600 font-bold group-hover:gap-4 transition-all">
                        Zistiť viac <ArrowRight size={18} />
                     </button>
                  </div>
               </div>

               <div className="bg-gray-900 text-white p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10">
                     <h4 className="text-xl font-bold">Potrebujete pomoc?</h4>
                     <p className="text-gray-400 text-sm">Naši pracovníci sú tu pre vás.</p>
                  </div>
                  <button className="relative z-10 px-8 py-3 bg-white text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-100 transition-colors">
                     Kontaktujte nás
                  </button>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
