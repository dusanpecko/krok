'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  Landmark, 
  Send, 
  Check, 
  Copy, 
  MessageSquare,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react'
import { sendContactMessage } from './actions'

export default function ContactForm() {
  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<'iban' | 'email' | 'phone' | null>(null)

  // Copy helper
  const copyToClipboard = (text: string, field: 'iban' | 'email' | 'phone') => {
    // Strip spaces for IBAN or phone copy if desired, but let's copy exactly as formatted
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    // Basic Client-side Validation
    if (!name.trim()) {
      setErrorMsg('Prosím, zadajte vaše meno.')
      setIsSubmitting(false)
      return
    }
    if (!email.trim()) {
      setErrorMsg('Prosím, zadajte váš e-mail.')
      setIsSubmitting(false)
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Prosím, zadajte platný e-mail.')
      setIsSubmitting(false)
      return
    }
    if (!subject.trim()) {
      setErrorMsg('Prosím, zadajte predmet správy.')
      setIsSubmitting(false)
      return
    }

    try {
      const res = await sendContactMessage({
        name,
        email,
        subject,
        message
      })

      if (res.success) {
        setSuccessMsg(res.message || 'Vaša správa bola úspešne odoslaná.')
        // Clear fields on success
        setName('')
        setEmail('')
        setSubject('')
        setMessage('')
      } else {
        setErrorMsg(res.error || 'Nastal problém pri odosielaní správy.')
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
      >
        {/* LEFT COLUMN: Contact & Billing Info */}
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
              <Sparkles size={12} className="text-blue-500 animate-pulse" />
              Sme tu pre vás
            </span>
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
              Kontaktujte <br/>
              <span className="text-blue-600">tím KROK</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Poslaním fondu KROK je vytvoriť Veľkú rodinu malých darcov, ktorým záleží na budúcnosti Žilinskej Diecézy. Radi vám odpovieme na akékoľvek otázky ohľadom našej činnosti, podpory projektov alebo správy vášho profilu.
            </p>
          </div>

          {/* Core Info Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {/* Address Card */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <MapPin size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-400 text-xs tracking-wider uppercase">Kancelária a sídlo</h4>
                <p className="font-extrabold text-gray-900 text-base">KROK – Pastoračný fond Žilinskej diecézy</p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Jána Kalinčiaka 1,<br />
                  010 01 Žilina
                </p>
              </div>
            </div>

            {/* Phone & Email Card */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              {/* Phone */}
              <div className="flex items-center gap-4 group">
                <button 
                  onClick={() => copyToClipboard('+421903982982', 'phone')}
                  className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 hover:bg-blue-100 group-hover:scale-110 transition-all cursor-pointer"
                  title="Kopírovať telefón"
                >
                  {copiedField === 'phone' ? <Check size={20} className="text-green-600" /> : <Phone size={24} />}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-400 text-xs tracking-wider uppercase">Telefón</h4>
                  <a href="tel:+421903982982" className="font-bold text-gray-900 hover:text-blue-600 transition-colors block text-base truncate">
                    +421 903 982 982
                  </a>
                </div>
                {copiedField === 'phone' && (
                  <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md animate-fade-in shrink-0">Kopírované</span>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Email */}
              <div className="flex items-center gap-4 group">
                <button 
                  onClick={() => copyToClipboard('mojkrok@dcza.sk', 'email')}
                  className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 hover:bg-blue-100 group-hover:scale-110 transition-all cursor-pointer"
                  title="Kopírovať email"
                >
                  {copiedField === 'email' ? <Check size={20} className="text-green-600" /> : <Mail size={24} />}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-400 text-xs tracking-wider uppercase">E-mail</h4>
                  <a href="mailto:mojkrok@dcza.sk" className="font-bold text-gray-900 hover:text-blue-600 transition-colors block text-base truncate">
                    mojkrok@dcza.sk
                  </a>
                </div>
                {copiedField === 'email' && (
                  <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md animate-fade-in shrink-0">Kopírované</span>
                )}
              </div>
            </div>

            {/* Billing & Bank Card */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-5 hover:shadow-md transition-shadow">
              {/* Billing Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={24} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="col-span-2">
                    <h4 className="font-bold text-gray-400 text-xs tracking-wider uppercase">Fakturačné údaje</h4>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">IČO</span>
                    <span className="font-bold text-gray-900 text-sm">52 60 18 97</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">DIČ</span>
                    <span className="font-bold text-gray-900 text-sm">21 21 13 90 42</span>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Bank Transfer Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Landmark size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-400 text-xs tracking-wider uppercase">Bankový účet (FIO banka)</h4>
                    <span className="text-xs text-gray-500">Pre priame milodary mimo donátorskej zóny</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-3 group relative overflow-hidden">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">IBAN kód</span>
                    <span className="font-mono font-bold text-xs text-gray-800 break-all select-all block mt-0.5">
                      SK04 8330 0000 0029 0168 8673
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard('SK0483300000002901688673', 'iban')}
                    className="p-2.5 bg-white text-gray-500 hover:text-blue-600 rounded-lg shadow-sm border border-gray-200/60 hover:border-blue-200 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                    title="Kopírovať IBAN"
                  >
                    {copiedField === 'iban' ? (
                      <>
                        <Check size={16} className="text-green-600" />
                        <span className="text-xs font-bold text-green-600">Skopírované!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span className="text-xs font-bold">Kopírovať</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contact Form Card */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
            {/* Header bar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Napíšte nám</h2>
                <p className="text-xs text-blue-100 mt-0.5">Máte otázku alebo nápad? Dajte nám vedieť.</p>
              </div>
            </div>

            {/* Form & Dialog contents */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                {successMsg ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center py-12 space-y-6"
                  >
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm border border-green-100">
                      <Check size={40} className="animate-bounce" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-gray-900">Správa odoslaná!</h3>
                      <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                        {successMsg}
                      </p>
                    </div>
                    <button
                      onClick={() => setSuccessMsg(null)}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
                    >
                      Poslať ďalšiu správu
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Alerts */}
                    {errorMsg && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700"
                      >
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <div className="text-sm font-semibold">{errorMsg}</div>
                      </motion.div>
                    )}

                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name input */}
                      <div className="space-y-2">
                        <label htmlFor="contact-name" className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                          Vaše meno
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="napr. Ján Kováč"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all disabled:opacity-60 text-sm font-medium"
                        />
                      </div>

                      {/* Email input */}
                      <div className="space-y-2">
                        <label htmlFor="contact-email" className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                          Váš e-mail
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="napr. jan.kovac@example.com"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all disabled:opacity-60 text-sm font-medium"
                        />
                      </div>

                      {/* Subject input */}
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label htmlFor="contact-subject" className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                          Predmet
                        </label>
                        <input
                          id="contact-subject"
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="napr. Otázka k donátorstvu / Potvrdenie pre dane"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all disabled:opacity-60 text-sm font-medium"
                        />
                      </div>

                      {/* Message input */}
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label htmlFor="contact-message" className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                          Vaša správa <span className="text-gray-400 font-normal lowercase">(voliteľné)</span>
                        </label>
                        <textarea
                          id="contact-message"
                          rows={5}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="Sem napíšte text vašej otázky alebo podnetu..."
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all disabled:opacity-60 resize-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:pointer-events-none group"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Odosiela sa...
                        </>
                      ) : (
                        <>
                          Odoslať správu
                          <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
