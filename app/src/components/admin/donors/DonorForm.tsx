'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, Phone, MapPin, Landmark, 
  CreditCard, FileText, Save, ArrowLeft, 
  CheckCircle2, AlertCircle, Building2, 
  Globe, ShieldCheck, Heart
} from 'lucide-react'
import Link from 'next/link'

interface Parish {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface Donor {
  id: string
  legacy_id?: string | null
  variable_symbol?: string | null
  title_before?: string | null
  first_name: string
  last_name: string
  title_after?: string | null
  formal_addressing?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  city?: string | null
  postal_code?: string | null
  iban?: string | null
  parish_id?: string | null
  donor_type: 'individual' | 'organization' | 'parish'
  status: 'active' | 'inactive' | 'suspended'
  notes?: string | null
  registered_at?: string | null
  updated_at?: string | null
  newsletter_opt_in?: boolean
  confirmation_method?: string | null
  company_name?: string | null
  ico?: string | null
  dic?: string | null
  website?: string | null
  donor_projects?: { project_id: string }[]
}

interface DonorFormProps {
  donor?: Donor
  parishes: Parish[]
  projects: Project[]
  donations?: any[]
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>
}

export default function DonorForm({ donor, parishes, projects, donations, onSave }: DonorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Initialize state with donor data or defaults
  const [formData, setFormData] = useState<Partial<Donor>>(donor || {
    first_name: '',
    last_name: '',
    donor_type: 'individual',
    status: 'active',
    newsletter_opt_in: false,
    confirmation_method: 'email'
  })

  // State for multi-project selection
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    donor?.donor_projects?.map(dp => dp.project_id) || []
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const result = await onSave({
        ...formData,
        project_ids: selectedProjectIds
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Údaje darcu boli úspešne uložené.' })
        setTimeout(() => router.refresh(), 1000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Nastala chyba pri ukladaní.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Nepodarilo sa spojiť so serverom.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-32">
      {/* Alert Messages */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 z-50 sticky top-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100 shadow-lg' : 'bg-red-50 text-red-700 border border-red-100 shadow-lg'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Common Data */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section: Typ darcu & Základné údaje */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">1</div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900">Základné údaje</h3>
                   <p className="text-xs text-gray-400">Identifikácia a typ darcu</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-1.5 rounded-xl flex gap-1">
                {(['individual', 'organization'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, donor_type: type }))}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      formData.donor_type === type 
                        ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {type === 'individual' ? 'Osoba' : 'Firma / Org.'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Titul pred</label>
                <input name="title_before" value={formData.title_before || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Oslovenie</label>
                <input name="formal_addressing" value={formData.formal_addressing || ''} onChange={handleChange} placeholder="Vážený pán / Vážená pani" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Meno *</label>
                <input name="first_name" required value={formData.first_name || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Priezvisko *</label>
                <input name="last_name" required value={formData.last_name || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold" />
              </div>
            </div>
          </div>

          {/* Section: Firemné údaje (Conditional) */}
          {formData.donor_type === 'organization' && (
            <div className="bg-white p-8 rounded-2xl border border-blue-100 shadow-sm space-y-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Building2 size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Údaje organizácie</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Názov firmy / organizácie</label>
                  <input name="company_name" value={formData.company_name || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">IČO</label>
                  <input name="ico" value={formData.ico || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">DIČ / IČ DPH</label>
                  <input name="dic" value={formData.dic || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Webová stránka</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input name="website" value={formData.website || ''} onChange={handleChange} placeholder="www.firma.sk" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Kontakt & Adresa */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">2</div>
                   <h3 className="text-lg font-bold text-gray-900">Kontakt</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">E-mail</label>
                    <input name="email" type="email" value={formData.email || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Mobil</label>
                    <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">3</div>
                   <h3 className="text-lg font-bold text-gray-900">Adresa</h3>
                </div>
                <div className="space-y-4">
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Ulica a číslo</label>
                    <input name="street" value={formData.street || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Mesto</label>
                      <input name="city" value={formData.city || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">PSČ</label>
                      <input name="postal_code" value={formData.postal_code || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: História darov (Integrated) */}
          {donations && donations.length > 0 && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold">
                     <Heart size={20} />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-gray-900">História darov</h3>
                      <p className="text-xs text-gray-400">Prehľad príspevkov darcu</p>
                   </div>
                </div>
                <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg uppercase tracking-widest">
                   {donations.length} platieb
                </span>
              </div>

              <div className="space-y-4">
                {(() => {
                  const years = [...new Set(donations.map(d => d.year))].sort((a,b) => b-a);
                  return years.map(year => (
                    <div key={year} className="space-y-3">
                      <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        <div className="h-[1px] flex-1 bg-gray-50"></div>
                        Rok {year}
                        <div className="h-[1px] flex-1 bg-gray-50"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {donations.filter(d => d.year === year).map(donation => (
                           <div key={donation.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-50 flex justify-between items-center group hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all">
                              <div className="space-y-0.5">
                                 <div className="text-xs font-bold text-gray-900">
                                    {new Date(donation.donation_date).toLocaleDateString('sk-SK')}
                                 </div>
                                 {donation.projects && (
                                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">
                                       {donation.projects.name}
                                    </div>
                                 )}
                              </div>
                              <div className="text-right">
                                 <div className="text-sm font-black text-green-600">
                                    +{donation.amount.toFixed(2)} €
                                 </div>
                                 <div className="text-[9px] text-gray-400 font-mono uppercase">
                                    {donation.payment_method === 'bank_transfer' ? 'Prevod' : 'Hotovosť'}
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Registry & Status & Preferences */}
        <div className="space-y-8">
          
          {/* Section: Registry */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Fondové údaje</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Variabilný symbol</label>
                <div className="relative">
                  <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input readOnly value={formData.variable_symbol || 'Generuje sa automaticky'} className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-mono font-black text-blue-700 cursor-not-allowed" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Farnosť</label>
                <select 
                  name="parish_id" 
                  value={formData.parish_id || ''} 
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm"
                >
                  <option value="">Bez farnosti</option>
                  {parishes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Podporovaný projekt</label>
                <select 
                  name="project_id"
                  value={selectedProjectIds.length > 0 ? selectedProjectIds[0] : ''} 
                  onChange={(e) => setSelectedProjectIds(e.target.value ? [e.target.value] : [])}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm"
                >
                  <option value="">Bez projektu (všeobecný dar)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Status</label>
                <div className="flex gap-1">
                  {['active', 'inactive'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: s as any }))}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                        formData.status === s 
                          ? 'bg-gray-900 border-gray-900 text-white' 
                          : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      {s === 'active' ? 'Aktívny' : 'Neaktívny'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Komunikácia a Preferences */}
          <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-blue-400" />
              <h3 className="text-sm font-black uppercase tracking-widest">Komunikácia</h3>
            </div>

            <div className="space-y-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  name="newsletter_opt_in" 
                  checked={formData.newsletter_opt_in || false} 
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500/20" 
                />
                <div>
                  <p className="text-sm font-bold group-hover:text-blue-400 transition-colors">Newsletter</p>
                  <p className="text-[10px] text-gray-400">Súhlas so zasielaním noviniek</p>
                </div>
              </label>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Potvrdenie o dare</label>
                <div className="grid grid-cols-2 gap-2">
                   {['email', 'post'].map(method => (
                     <button
                        key={method}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, confirmation_method: method }))}
                        className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          formData.confirmation_method === method
                            ? 'bg-blue-600 border-blue-600 text-whiteShadow'
                            : 'bg-gray-800 border-gray-700 text-gray-400'
                        }`}
                     >
                       {method === 'email' ? 'E-mailom' : 'Poštou'}
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </div>

          {/* Registry Date Info */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider">Reg. dátum</span>
              <span className="text-gray-900 font-mono font-bold">
                {formData.registered_at ? new Date(formData.registered_at).toLocaleDateString('sk-SK') : 'Dnes'}
              </span>
            </div>
            {donor?.updated_at && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Posledná zmena</span>
                <span className="text-gray-500 font-mono">{new Date(donor.updated_at).toLocaleString('sk-SK')}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Poznámka</label>
             <textarea 
               name="notes"
               value={formData.notes || ''}
               onChange={handleChange}
               rows={4}
               className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm resize-none"
             />
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-gray-200 px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-8 min-w-[500px]">
        <Link href="/admin/darcovia" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={18} />
          Zrušiť
        </Link>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Dátum registrácie</p>
          <p className="text-sm font-bold text-gray-900">
            {formData.registered_at ? new Date(formData.registered_at).toLocaleDateString() : 'Dnes'}
          </p>
        </div>
        <button 
          type="submit"
          disabled={loading}
          className={`flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Uložiť darcu
        </button>
      </div>
    </form>
  )
}
