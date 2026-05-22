'use client'

import { useState, useEffect } from 'react'
import { 
  User, History, Heart, Save, AlertCircle, 
  CheckCircle2, CreditCard, Mail, Phone, MapPin, 
  ChevronRight, Landmark, ArrowRight
} from 'lucide-react'
import { updateProfile } from '@/app/(public)/profil/actions'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface ProfileContentProps {
  donor: any
  donations: any[]
}

type Tab = 'data' | 'donations' | 'support'

// Sparkle časticový efekt pre prémiový sakrálny vzhľad
function BackgroundSparkles() {
  const [mounted, setMounted] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || prefersReducedMotion) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-gold-bright rounded-full opacity-35"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [0, 1.2, 0],
            opacity: [0, 0.7, 0],
            y: [0, -60 - Math.random() * 60]
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  )
}

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

  const prefersReducedMotion = useReducedMotion()

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
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep text-white font-sans selection:bg-gold-bright/35 selection:text-white min-h-screen overflow-hidden pb-24">
      {/* Filmové zrno pre hmatateľný sakrálny retro efekt */}
      <div className="grain" />

      {/* Kontemplatívne pozadie - nočný prechod a svetelné závoje */}
      <div className="absolute inset-0 bg-radial-[at_center_top] from-blue/30 via-blue-deep to-blue-deep z-0" />

      {/* Dekoratívne ambientné osvetlenie */}
      <motion.div 
        className="absolute top-[10%] left-[5%] w-[60vw] h-[40vh] rounded-full bg-blue/15 blur-[130px] pointer-events-none z-0"
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.45, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-[20%] right-[-10%] w-[50vw] h-[40vh] rounded-full bg-gold/5 blur-[120px] pointer-events-none z-0"
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.05, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />

      <BackgroundSparkles />

      {/* Hlavný kontajner */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-12 sm:pt-40 sm:pb-16 lg:pt-48 lg:pb-20 space-y-10">
        
        {/* =========================================================================
            HEADER - KARTA DONÁTORA
            ========================================================================= */}
        <motion.div 
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl hover:border-white/15 transition-all duration-300 group"
        >
          {/* Ambientný záblesk v pozadí karty pri hoveri */}
          <div className="absolute -inset-px bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl" />
          
          <div className="flex items-center gap-5 sm:gap-6 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gold/25 to-gold/5 text-gold-bright border border-gold/45 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-serif font-bold shadow-xl shadow-gold/5 group-hover:scale-105 transition-transform duration-500 shrink-0">
              {donor.first_name?.[0]}{donor.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight leading-none mb-2">
                {donor.first_name} <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white">{donor.last_name}</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium flex items-center gap-2">
                <Mail size={14} className="text-gold-bright" /> {donor.email}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end bg-gold/5 border border-gold/25 rounded-2xl px-5 py-3.5 backdrop-blur-sm shadow-inner min-w-[200px] relative z-10 self-start md:self-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-gold-bright/70">Variabilný symbol</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white tracking-wider mt-1">
              {donor.variable_symbol}
            </span>
          </div>
        </motion.div>

        {/* =========================================================================
            TABS SELECTOR - PREPÍNAČ
            ========================================================================= */}
        <motion.div 
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl w-full sm:w-max backdrop-blur-md shadow-xl overflow-x-auto sm:overflow-x-visible no-scrollbar animate-in fade-in duration-500"
        >
          <div className="flex w-full sm:w-auto min-w-max gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center justify-center sm:justify-start gap-2.5 px-5 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 cursor-pointer w-full sm:w-auto
                    ${isActive 
                      ? 'bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep shadow-lg shadow-gold/15 scale-[1.02]' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-blue-deep' : 'text-zinc-400 group-hover:text-white'} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* =========================================================================
            TAB CONTENT - OBSAH
            ========================================================================= */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {activeTab === 'data' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ľavá časť: formulár */}
                <div className="lg:col-span-2 space-y-6">
                  <form onSubmit={handleUpdate} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl relative">
                    <div className="p-6 sm:p-8 space-y-6">
                      
                      <div className="flex items-center gap-3.5 border-b border-white/10 pb-6">
                        <div className="w-10 h-10 bg-white/5 border border-white/10 text-gold-bright rounded-xl flex items-center justify-center shrink-0">
                          <User size={20} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Osobné informácie</h3>
                          <p className="text-xs text-zinc-400 font-light mt-0.5">Správa vašich identifikačných údajov</p>
                        </div>
                      </div>

                      {message && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl flex items-start gap-3 border backdrop-blur-sm ${
                            message.type === 'success' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                          </div>
                          <p className="text-sm font-semibold">{message.text}</p>
                        </motion.div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-extrabold text-gold-bright/70 uppercase tracking-wider block">Meno</label>
                          <input 
                            name="first_name" 
                            value={formData.first_name} 
                            onChange={handleChange} 
                            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold-bright/60 focus:ring-1 focus:ring-gold-bright/60 outline-none transition-all duration-300 text-sm font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-extrabold text-gold-bright/70 uppercase tracking-wider block">Priezvisko</label>
                          <input 
                            name="last_name" 
                            value={formData.last_name} 
                            onChange={handleChange} 
                            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold-bright/60 focus:ring-1 focus:ring-gold-bright/60 outline-none transition-all duration-300 text-sm font-semibold"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-extrabold text-gold-bright/70 uppercase tracking-wider block">Telefón</label>
                          <input 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            placeholder="+421..."
                            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold-bright/60 focus:ring-1 focus:ring-gold-bright/60 outline-none transition-all duration-300 text-sm font-semibold"
                          />
                        </div>
                      </div>

                      <div className="space-y-6 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-3.5 pb-2">
                          <div className="w-10 h-10 bg-white/5 border border-white/10 text-gold-bright rounded-xl flex items-center justify-center shrink-0">
                            <MapPin size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Kontaktná adresa</h3>
                            <p className="text-xs text-zinc-400 font-light mt-0.5">Adresa pre doručovanie potvrdení o daroch</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-extrabold text-gold-bright/70 uppercase tracking-wider block">Ulica a číslo</label>
                            <input 
                              name="street" 
                              value={formData.street} 
                              onChange={handleChange} 
                              className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold-bright/60 focus:ring-1 focus:ring-gold-bright/60 outline-none transition-all duration-300 text-sm font-semibold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-extrabold text-gold-bright/70 uppercase tracking-wider block">Mesto</label>
                            <input 
                              name="city" 
                              value={formData.city} 
                              onChange={handleChange} 
                              className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold-bright/60 focus:ring-1 focus:ring-gold-bright/60 outline-none transition-all duration-300 text-sm font-semibold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-extrabold text-gold-bright/70 uppercase tracking-wider block">PSČ</label>
                            <input 
                              name="postal_code" 
                              value={formData.postal_code} 
                              onChange={handleChange} 
                              className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold-bright/60 focus:ring-1 focus:ring-gold-bright/60 outline-none transition-all duration-300 text-sm font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-white/[0.02] border-t border-white/10 flex justify-end">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep rounded-2xl text-sm font-black shadow-xl shadow-gold/15 hover:shadow-gold/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer animate-in fade-in"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-blue-deep/30 border-t-blue-deep rounded-full animate-spin" />
                        ) : (
                          <Save size={18} className="text-blue-deep" />
                        )}
                        <span>Uložiť zmeny</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Pravá časť: sumár darcu */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-b from-blue/25 to-blue-deep/45 border border-white/10 backdrop-blur-md p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-gold/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl pointer-events-none group-hover:bg-gold/10 transition-colors" />
                    
                    <h3 className="text-sm font-black uppercase tracking-widest border-l-4 border-gold pl-4 text-gold-bright mb-6">Zhrnutie darcu</h3>
                    
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-center py-3.5 border-b border-white/5 hover:border-white/10 transition-colors">
                        <span className="text-zinc-400 text-sm font-light">Registrovaný od</span>
                        <span className="font-bold text-white">
                          {donor.registered_at ? new Date(donor.registered_at).toLocaleDateString('sk-SK') : 
                           donor.created_at ? new Date(donor.created_at).toLocaleDateString('sk-SK') : 'Neznáme'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3.5 border-b border-white/5 hover:border-white/10 transition-colors">
                        <span className="text-zinc-400 text-sm font-light">Farnosť</span>
                        <span className="font-bold text-white">{donor.parishes?.name || 'Všeobecná'}</span>
                      </div>
                      <div className="flex justify-between items-center py-3.5">
                        <span className="text-zinc-400 text-sm font-light">Status</span>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          donor.status === 'active' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                        }`}>
                          {donor.status === 'active' ? 'Aktívny' : 'Neaktívny'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'donations' && (
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden p-6 sm:p-8 space-y-8 shadow-2xl">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-white/5 border border-white/10 text-gold-bright rounded-xl flex items-center justify-center shrink-0">
                      <History size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">História príspevkov</h3>
                      <p className="text-xs text-zinc-400 font-light mt-0.5">Prehľad všetkých vašich darov pre fond KROK</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl self-start sm:self-auto min-w-[150px]">
                     <p className="text-[10px] font-black text-gold-bright/70 uppercase tracking-widest leading-none mb-1.5">Spolu darované</p>
                     <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white leading-none">
                       {donations.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                     </p>
                  </div>
                </div>

                {donations.length === 0 ? (
                  <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl animate-in fade-in">
                     <Landmark size={48} className="mx-auto text-zinc-600 mb-4 animate-pulse" />
                     <p className="text-zinc-400 font-bold">Zatiaľ ste neposlali žiadne príspevky.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                     {donations.map((donation) => (
                       <div key={donation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 bg-white/5 hover:bg-white/8 border border-white/5 hover:border-gold/25 rounded-2xl transition-all duration-300 group shadow-md gap-4">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-white/5 text-gold-bright border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-gold/30 transition-all">
                                <Landmark size={20} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white tracking-wide group-hover:text-gold-bright transition-colors">
                                  {donation.projects?.name || 'Všeobecný dar'}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                  {new Date(donation.donation_date).toLocaleDateString('sk-SK')}
                                </p>
                             </div>
                          </div>
                          <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-white/5 sm:border-0 pt-3 sm:pt-0">
                             <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white">
                               +{donation.amount.toFixed(2)} €
                             </p>
                             <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mt-0.5">
                               {donation.payment_method === 'bank_transfer' ? 'Prevod' : 'Hotovosť'}
                             </p>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="max-w-3xl mx-auto space-y-10 py-4 sm:py-8">
                 <div className="text-center space-y-4 animate-in fade-in duration-700">
                    <div className="w-20 h-20 bg-gold/10 text-gold border border-gold/25 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gold/5 relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gold/5 animate-pulse rounded-full" />
                       <Heart size={36} fill="currentColor" className="text-gold-bright relative z-10" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight leading-tight">
                       Chcem <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white">podporiť</span>
                    </h2>
                    <p className="text-zinc-300 text-sm max-w-lg mx-auto leading-relaxed font-light">
                      Vaša pomoc nám umožňuje rásť a pomáhať tam, kde je to najviac potrebné. Vyberte si spôsob podpory.
                    </p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md hover:border-gold/30 hover:bg-white/8 transition-all duration-300 group flex flex-col justify-between shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-xl pointer-events-none group-hover:bg-gold/10 transition-colors" />
                       <div>
                          <CreditCard size={32} className="text-gold-bright mb-6" />
                          <h3 className="text-xl font-bold text-white mb-2">Jednorazový dar</h3>
                          <p className="text-sm text-zinc-400 mb-8 leading-relaxed font-light">
                             Podporte nás jednorazovým príspevkom cez platobnú bránu alebo prevodom.
                          </p>
                       </div>
                       <button className="flex items-center gap-2 text-gold-bright font-extrabold group-hover:gap-3.5 transition-all text-sm cursor-pointer self-start">
                          <span>Pokračovať k daru</span> <ArrowRight size={16} />
                       </button>
                    </div>

                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md hover:border-gold/30 hover:bg-white/8 transition-all duration-300 group flex flex-col justify-between shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-xl pointer-events-none group-hover:bg-gold/10 transition-colors" />
                       <div>
                          <History size={32} className="text-gold-bright mb-6" />
                          <h3 className="text-xl font-bold text-white mb-2">Pravidelný dar</h3>
                          <p className="text-sm text-zinc-400 mb-8 leading-relaxed font-light">
                             Nastavte si trvalý príkaz a pomáhajte nám dlhodobo a predvídateľne.
                          </p>
                       </div>
                       <button className="flex items-center gap-2 text-gold-bright font-extrabold group-hover:gap-3.5 transition-all text-sm cursor-pointer self-start">
                          <span>Zistiť viac</span> <ArrowRight size={16} />
                       </button>
                    </div>
                 </div>

                 <div className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-2xl hover:border-white/15 transition-all">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                    <div className="relative z-10 text-center md:text-left">
                       <h4 className="text-xl font-bold text-white">Potrebujete pomoc?</h4>
                       <p className="text-zinc-400 text-sm font-light mt-1">Naši pracovníci sú tu pre vás, neváhajte nás kontaktovať.</p>
                    </div>
                    <button className="relative z-10 px-8 py-3.5 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gold/15 cursor-pointer shrink-0">
                       Kontaktujte nás
                    </button>
                 </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
