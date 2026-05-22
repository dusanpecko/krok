'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  Coffee, 
  Landmark, 
  Check, 
  Copy, 
  ArrowRight, 
  Info, 
  Sparkles, 
  Building2, 
  User2, 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  Loader2,
  Calendar,
  ExternalLink
} from 'lucide-react'
import { registerDonor } from './actions'

interface RegistrationFormProps {
  parishes: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
}

const DONATION_TIERS = [
  { id: '4', label: '1 káva týždenne', amount: 4, desc: 'Symbolická podpora diecéznych pastorácií.' },
  { id: '8', label: '2 kávy týždenne', amount: 8, desc: 'Aktívna podpora pre pastoračné aktivity.', isPopular: true },
  { id: '30', label: '1 káva denne', amount: 30, desc: 'Významná pomoc pre rozvoj väčších diel.' },
  { id: 'custom', label: 'Iná suma', amount: null, desc: 'Zadajte vlastnú mesačnú sumu v eurách.' }
]

export default function RegistrationForm({ parishes, projects }: RegistrationFormProps) {
  // Form State
  const [donorType, setDonorType] = useState<'individual' | 'organization'>('individual')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [ico, setIco] = useState('')
  const [dic, setDic] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  
  const [selectedTier, setSelectedTier] = useState('8')
  const [customAmount, setCustomAmount] = useState('')
  const [projectId, setProjectId] = useState('')
  const [parishId, setParishId] = useState('')
  const [noParish, setNoParish] = useState(false)
  const [confirmationMethod, setConfirmationMethod] = useState<'E-mailom' | 'Poštou'>('E-mailom')
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [notes, setNotes] = useState('')

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<any | null>(null)
  const [copiedField, setCopiedField] = useState<'vs' | 'iban' | null>(null)

  // Copy helper
  const copyToClipboard = (text: string, field: 'vs' | 'iban') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    // Basic Validation
    if (donorType === 'individual' && (!firstName || !lastName)) {
      setErrorMsg('Prosím, vyplňte vaše meno a priezvisko.')
      setIsSubmitting(false)
      return
    }
    if (donorType === 'organization' && !companyName) {
      setErrorMsg('Prosím, vyplňte názov firmy / organizácie.')
      setIsSubmitting(false)
      return
    }
    if (!email) {
      setErrorMsg('Prosím, vyplňte váš e-mail.')
      setIsSubmitting(false)
      return
    }
    if (!city) {
      setErrorMsg('Prosím, vyplňte vaše mesto / obec.')
      setIsSubmitting(false)
      return
    }

    let donationProgramStr = ''
    let amountNum: number | null = null

    if (selectedTier === 'custom') {
      const parsed = parseFloat(customAmount.replace(',', '.'))
      if (isNaN(parsed) || parsed <= 0) {
        setErrorMsg('Prosím, zadajte platnú vlastnú sumu daru.')
        setIsSubmitting(false)
        return
      }
      donationProgramStr = 'Čiastku si volím sám'
      amountNum = parsed
    } else {
      const tierObj = DONATION_TIERS.find(t => t.id === selectedTier)
      donationProgramStr = tierObj ? `${tierObj.label} (${tierObj.amount} €)` : ''
      amountNum = tierObj ? tierObj.amount : null
    }

    const payload = {
      donor_type: donorType,
      first_name: donorType === 'individual' ? firstName : '',
      last_name: donorType === 'individual' ? lastName : '',
      company_name: donorType === 'organization' ? companyName : '',
      ico: donorType === 'organization' ? ico : '',
      dic: donorType === 'organization' ? dic : '',
      email,
      phone,
      street,
      city,
      postal_code: postalCode,
      donation_program: donationProgramStr,
      custom_amount: selectedTier === 'custom' ? amountNum : null,
      project_id: projectId || null,
      parish_id: noParish ? null : (parishId || null),
      confirmation_method: confirmationMethod,
      newsletter_opt_in: newsletterOptIn ? 'áno' : 'nie',
      notes
    }

    try {
      const res = await registerDonor(payload)
      if (res.success && res.donor) {
        setSuccessData({
          vs: res.donor.variable_symbol,
          first_name: res.donor.first_name || '',
          last_name: res.donor.last_name || '',
          company_name: donorType === 'organization' ? companyName : '',
          amount: amountNum,
          email: res.donor.email
        })
      } else {
        setErrorMsg(res.error || 'Nastal problém pri spracovaní registrácie.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Vyskytla sa neočakávaná chyba. Skúste to prosím neskôr.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AnimatePresence mode="wait">
        {!successData ? (
          <motion.div 
            key="registration-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
          >
            {/* LEFT COLUMN: Inspirational info */}
            <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-28">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                  <Sparkles size={12} />
                  Diecézny pastoralný fond
                </span>
                <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
                  Staň sa darcom <br/>
                  <span className="text-blue-600">spoločenstva KROK</span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Tvoj pravidelný príspevok v cene niekoľkých káv mesačne nám dáva stabilitu pri budovaní pastoračných a duchovných diel v celej Žilinskej diecéze.
                </p>
              </div>

              {/* Tiers List */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Coffee className="text-blue-600" size={20} />
                  Ako pomáha donátorský program?
                </h3>
                
                <div className="grid gap-3">
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 font-bold">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Pravidelnosť robí zázraky</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Pravidelné mesačné príspevky nám umožňujú dlhodobo plánovať podporu pre farnosti a mladých.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0 font-bold">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900">100% transparentnosť</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Každý príspevok je presne evidovaný a smeruje priamo na aktivity fondu. KROK nezadržiava žiadne provízie.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                    <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600 shrink-0 font-bold">3</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Darcovská zóna</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Získate prístup do vlastného profilu, kde máte kedykoľvek prehľad o svojich príspevkoch a stiahnete si potvrdenia pre dane.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal Note */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-500 space-y-2">
                <p className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Info size={14} className="text-gray-400" />
                  Právne informácie o fonde KROK
                </p>
                <p>
                  KROK je oficiálny pastoračný fond zriadený Rímskokatolíckou cirkvou – Žilinskou diecézou.
                  Sídlo: Jána Kalinčiaka 3098/1, 010 01 Žilina.
                </p>
                <p>IČO: 55 97 15 21</p>
              </div>
            </div>

            {/* RIGHT COLUMN: Registration Form Card */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header bar */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
                  <h2 className="text-2xl font-bold">Registračný formulár</h2>
                  <p className="text-blue-100 text-sm mt-1">Vyplňte, prosím, vaše údaje pre zaradenie do fondu.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                  {errorMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 flex items-start gap-3"
                    >
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 shrink-0" />
                      <p>{errorMsg}</p>
                    </motion.div>
                  )}

                  {/* 1. Donor Type Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Typ prispievateľa</label>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-gray-50 rounded-xl border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setDonorType('individual')}
                        className={`py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          donorType === 'individual'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <User2 size={16} />
                        Fyzická osoba
                      </button>
                      <button
                        type="button"
                        onClick={() => setDonorType('organization')}
                        className={`py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          donorType === 'organization'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <Building2 size={16} />
                        Firma / Organizácia
                      </button>
                    </div>
                  </div>

                  {/* 2. Personal/Company details */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-2">
                      {donorType === 'individual' ? 'Osobné údaje' : 'Firemné údaje'}
                    </label>

                    {donorType === 'individual' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label htmlFor="first_name" className="text-sm font-semibold text-gray-700">Meno <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            id="first_name"
                            required
                            autoComplete="given-name"
                            placeholder="napr. Jozef"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="last_name" className="text-sm font-semibold text-gray-700">Priezvisko <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            id="last_name"
                            required
                            autoComplete="family-name"
                            placeholder="napr. Kováč"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label htmlFor="company_name" className="text-sm font-semibold text-gray-700">Obchodné meno / Názov firmy <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            id="company_name"
                            required
                            autoComplete="organization"
                            placeholder="napr. KROK s.r.o."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label htmlFor="ico" className="text-sm font-semibold text-gray-700">IČO</label>
                            <input
                              type="text"
                              id="ico"
                              placeholder="napr. 12345678"
                              value={ico}
                              onChange={(e) => setIco(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="dic" className="text-sm font-semibold text-gray-700">DIČ</label>
                            <input
                              type="text"
                              id="dic"
                              placeholder="napr. 2021234567"
                              value={dic}
                              onChange={(e) => setDic(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Contact details */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-2">Kontaktné údaje</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Mail size={14} className="text-gray-400" />
                          E-mail <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          autoComplete="email"
                          placeholder="napr. jozef@email.sk"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Phone size={14} className="text-gray-400" />
                          Telefón
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          autoComplete="tel"
                          placeholder="napr. +421 900 123 456"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Address details */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-2">Poštová adresa</label>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="street" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          Ulica a číslo
                        </label>
                        <input
                          type="text"
                          id="street"
                          autoComplete="address-line1"
                          placeholder="napr. Kalinčiaka 1"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                          <label htmlFor="city" className="text-sm font-semibold text-gray-700">Mesto / Obec <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            id="city"
                            required
                            autoComplete="address-level2"
                            placeholder="napr. Žilina"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="postal_code" className="text-sm font-semibold text-gray-700">PSČ</label>
                          <input
                            type="text"
                            id="postal_code"
                            autoComplete="postal-code"
                            placeholder="napr. 010 01"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Donation Tiers selection */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-2">Donátorský program (Mesačne)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DONATION_TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSelectedTier(tier.id)}
                          className={`p-4 rounded-2xl border text-left transition-all relative ${
                            selectedTier === tier.id
                              ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          {tier.isPopular && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                              Najčastejší dar
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {tier.id === 'custom' ? (
                              <Heart size={16} className={selectedTier === tier.id ? 'text-blue-600' : 'text-gray-400'} />
                            ) : (
                              <Coffee size={16} className={selectedTier === tier.id ? 'text-blue-600' : 'text-gray-400'} />
                            )}
                            <span className="font-bold text-gray-900">{tier.label}</span>
                            {tier.amount && (
                              <span className="ml-auto text-lg font-black text-blue-600">{tier.amount} €</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{tier.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Vlastná suma input */}
                    <AnimatePresence>
                      {selectedTier === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 space-y-1.5">
                            <label htmlFor="custom_amount" className="text-sm font-semibold text-gray-700">Zadajte sumu v EUR mesačne <span className="text-red-500">*</span></label>
                            <div className="relative rounded-xl shadow-sm">
                              <input
                                type="text"
                                id="custom_amount"
                                placeholder="napr. 15"
                                inputMode="numeric"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">€ / mesiac</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 6. Support project and parish */}
                  <div className="space-y-6">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-2">Prepojenie s diecézou</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Projects dropdown */}
                      <div className="space-y-1.5">
                        <label htmlFor="project" className="text-sm font-semibold text-gray-700">Chcem podporiť</label>
                        <select
                          id="project"
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 text-sm font-medium text-gray-900 bg-white transition-colors"
                        >
                          <option value="">Celý pastoračný fond KROK</option>
                          {projects.map((proj) => (
                            <option key={proj.id} value={proj.id}>
                              {proj.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Parishes dropdown */}
                      <div className="space-y-1.5">
                        <label htmlFor="parish" className="text-sm font-semibold text-gray-700">Moja farnosť</label>
                        <AnimatePresence mode="wait">
                          {!noParish ? (
                            <motion.div
                              key="parish-select"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <select
                                id="parish"
                                value={parishId}
                                onChange={(e) => setParishId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 text-sm font-medium text-gray-900 bg-white transition-colors"
                              >
                                <option value="">Zvoľte farnosť...</option>
                                {parishes.map((par) => (
                                  <option key={par.id} value={par.id}>
                                    {par.name}
                                  </option>
                                ))}
                              </select>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="parish-disabled"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed"
                            >
                              Bez priradenia farnosti
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div className="flex items-center gap-2 pt-1.5">
                          <input
                            type="checkbox"
                            id="no_parish"
                            checked={noParish}
                            onChange={(e) => setNoParish(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <label htmlFor="no_parish" className="text-xs font-semibold text-gray-500 select-none cursor-pointer">
                            Nechcem uviesť farnosť
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 7. Settings and opt ins */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-2">Potvrdzovanie a prehľady</label>
                    
                    <div className="space-y-3">
                      <span className="text-sm font-semibold text-gray-700 block">
                        Ako chcete dostávať ročné potvrdenia o daroch pre daňové účely?
                      </span>
                      <div className="flex gap-6">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="confirmation_method"
                            value="E-mailom"
                            checked={confirmationMethod === 'E-mailom'}
                            onChange={() => setConfirmationMethod('E-mailom')}
                            className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span className="text-sm font-medium text-gray-700">E-mailom (odporúčané)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="confirmation_method"
                            value="Poštou"
                            checked={confirmationMethod === 'Poštou'}
                            onChange={() => setConfirmationMethod('Poštou')}
                            className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span className="text-sm font-medium text-gray-700">Poštou</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="newsletter"
                        checked={newsletterOptIn}
                        onChange={(e) => setNewsletterOptIn(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
                      />
                      <label htmlFor="newsletter" className="text-sm font-medium text-gray-600 select-none cursor-pointer">
                        Chcem dostávať novinky o pastoračných projektoch a aktivitách fondu KROK (max. 1x mesačne).
                      </label>
                    </div>
                  </div>

                  {/* 8. Notes */}
                  <div className="space-y-1.5">
                    <label htmlFor="notes" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-gray-400" />
                      Poznámka pre fond (nepovinné)
                    </label>
                    <textarea
                      id="notes"
                      placeholder="Môžete nám zanechať odkaz, informácie alebo osobitné prianie..."
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium text-gray-900 transition-colors"
                    />
                  </div>

                  {/* Consent text */}
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Odoslaním formulára súhlasíte so spracovaním osobných údajov pre účely administrácie milodarov a plnenia zákonných povinností pastoračného fondu KROK. Viac informácií nájdete v sekcii <a href="/ochrana-udajov" target="_blank" className="text-blue-600 hover:underline">Ochrana osobných údajov</a>.
                  </p>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Spracovávam registráciu...
                      </>
                    ) : (
                      <>
                        Zaregistrovať sa a zobraziť platobné údaje
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        ) : (
          /* SUCCESS VIEW: Premium confirmation page with VS and instructions */
          <motion.div 
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="max-w-3xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden"
          >
            {/* Top decorative banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-center text-white relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Check size={36} className="stroke-[3]" />
              </div>
              <h1 className="text-3xl font-extrabold">Ďakujeme za vašu podporu!</h1>
              <p className="text-emerald-50 mt-1 font-medium">Registrácia prebehla úspešne a boli ste zaradený do fondu.</p>
            </div>

            <div className="p-8 lg:p-12 space-y-8">
              <div className="text-center max-w-lg mx-auto">
                <h2 className="text-xl font-bold text-gray-900">Vitajte v spoločenstve KROK</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Na zadaný e-mail <strong>{successData.email}</strong> sme vám odoslali potvrdenie s platobnými inštrukciami a odkazom na aktiváciu vášho darcovského profilu.
                </p>
              </div>

              {/* PAYMENT BOX */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-6 space-y-6">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-center">Platobné pokyny</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                  {/* Variable Symbol */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Variabilný symbol (VS)</span>
                      <span className="text-3xl font-black text-blue-600 mt-2 block select-all tracking-wider">{successData.vs}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(successData.vs, 'vs')}
                      className="mt-4 w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-bold text-gray-600 transition-all flex items-center justify-center gap-1.5"
                    >
                      {copiedField === 'vs' ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          Skopírované!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Kopírovať VS
                        </>
                      )}
                    </button>
                  </div>

                  {/* Monthly Amount */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Pravidelná mesačná suma</span>
                      <span className="text-3xl font-black text-gray-900 mt-2 block">
                        {successData.amount ? `${successData.amount},00 €` : 'Vlastná suma'}
                      </span>
                    </div>
                    <div className="mt-4 py-2.5 text-center text-xs font-semibold text-slate-500 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center gap-1">
                      <Calendar size={14} className="text-slate-400" />
                      Odporúčaný termín: k 5. v mesiaci
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2 gap-1.5">
                    <span className="text-sm font-semibold text-slate-500">Číslo účtu (IBAN)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg select-all">
                        SK04 8330 0000 0029 0168 8673
                      </span>
                      <button
                        onClick={() => copyToClipboard('SK0483300000002901688673', 'iban')}
                        className="p-2 bg-white border border-slate-200 hover:border-blue-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        aria-label="Kopírovať IBAN"
                      >
                        {copiedField === 'iban' ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between py-1 border-t border-slate-100 text-sm">
                    <span className="font-semibold text-slate-500">Príjemca</span>
                    <span className="font-bold text-slate-800 text-right">KROK – Pastoračný fond Žilinskej diecézy</span>
                  </div>

                  <div className="flex justify-between py-1 border-t border-slate-100 text-sm">
                    <span className="font-semibold text-slate-500">Názov banky</span>
                    <span className="font-bold text-slate-800">Fio banka, a.s.</span>
                  </div>
                </div>
              </div>

              {/* Instructions and tips */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Landmark className="text-blue-600" size={18} />
                  Čo urobiť teraz?
                </h4>
                
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100/60 text-sm text-slate-700 space-y-3 leading-relaxed">
                  <p className="font-bold text-blue-900">
                    1. Nastavte si trvalý príkaz vo svojej banke
                  </p>
                  <p>
                    Otvorte si svoje internetové bankovníctvo alebo mobilnú aplikáciu svojej banky a vytvorte **trvalý mesačný príkaz** na vyššie uvedený IBAN s vygenerovaným **Variabilným symbolom**. Pravidelnosť vášho daru je to, čo pomáha Žilinskej diecéze najviac.
                  </p>
                  <p className="font-bold text-blue-900 pt-2">
                    2. Skontrolujte si e-mailovú schránku
                  </p>
                  <p>
                    Odoslali sme vám e-mail so všetkými platobnými údajmi, aby ste ich mali poruke. Ak e-mail nenájdete do 5 minút, skontrolujte si zložku so spamom alebo reklamami.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
                <a
                  href="/"
                  className="px-8 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-center transition-all cursor-pointer text-sm"
                >
                  Domov
                </a>
                <a
                  href="https://dcza.sk"
                  target="_blank"
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  Stránka diecézy
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
