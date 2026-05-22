'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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

  const prefersReducedMotion = useReducedMotion()

  // Copy helper
  const copyToClipboard = (text: string, field: 'iban' | 'email' | 'phone') => {
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
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep text-white font-sans selection:bg-gold-bright/35 selection:text-white min-h-screen overflow-hidden pb-24">
      {/* Filmové zrno pre hmatateľný sakrálny retro efekt */}
      <div className="grain" />

      {/* Kontemplatívne pozadie - nočný prechod a svetelné závoje */}
      <div className="absolute inset-0 bg-radial-[at_center_top] from-blue/30 via-blue-deep to-blue-deep z-0" />

      {/* Dekoratívne ambientné osvetlenie z manuálu */}
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

      {/* =========================================================================
          HERO HEADER SEKCIA
          ========================================================================= */}
      <section className="relative z-10 pt-36 pb-12 sm:pt-40 sm:pb-16 lg:pt-48 lg:pb-20 text-center max-w-4xl mx-auto px-4">
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          className="mb-6"
        >
          <span className="px-4 py-1.5 rounded-full border border-gold/25 bg-gold/5 text-gold-bright text-xs tracking-widest uppercase font-extrabold">
            Otvorená komunikácia
          </span>
        </motion.div>

        <motion.h1 
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
          className="text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight mb-6"
        >
          Spojme sa pre <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-bright to-white font-extrabold">
            spoločné dielo viery.
          </span>
        </motion.h1>

        <motion.p
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.4 }}
          className="text-zinc-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-light"
        >
          Máte otázky o podpore pastoračných projektov, správe vášho účtu alebo chcete 
          prispieť vlastným nápadom? Náš tím je pripravený vám pomôcť na každom kroku.
        </motion.p>
      </section>

      {/* =========================================================================
          HLAVNÝ KONTENT (Karty & Formulár)
          ========================================================================= */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
        >
          {/* ĽAVÝ STĹPEC: Kontaktné informácie */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Kancelária a sídlo */}
            <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl hover:border-white/15 hover:bg-white/8 transition-all group flex items-start gap-4 shadow-xl">
              <div className="w-12 h-12 bg-white/5 text-gold border border-white/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-gold/30 transition-all">
                <MapPin size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-gold text-xs tracking-wider uppercase">Kancelária a sídlo</h4>
                <p className="font-extrabold text-white text-base">KROK – Pastoračný fond Žilinskej diecézy</p>
                <p className="text-zinc-300 text-sm leading-relaxed font-light">
                  Jána Kalinčiaka 1,<br />
                  010 01 Žilina
                </p>
              </div>
            </div>

            {/* Telefón a email s kopírovaním */}
            <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl hover:border-white/15 hover:bg-white/8 transition-all space-y-4 shadow-xl">
              {/* Telefón */}
              <div className="flex items-center gap-4 group">
                <button 
                  onClick={() => copyToClipboard('+421903982982', 'phone')}
                  className="w-12 h-12 bg-white/5 text-gold border border-white/10 rounded-xl flex items-center justify-center shrink-0 hover:bg-white/10 hover:border-gold/30 group-hover:scale-105 transition-all cursor-pointer relative"
                  title="Kopírovať telefón"
                >
                  {copiedField === 'phone' ? <Check size={20} className="text-green-400" /> : <Phone size={24} />}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-zinc-400 text-xs tracking-wider uppercase">Telefón</h4>
                  <a href="tel:+421903982982" className="font-bold text-white hover:text-gold transition-colors block text-base truncate">
                    +421 903 982 982
                  </a>
                </div>
                <AnimatePresence>
                  {copiedField === 'phone' && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-green-400 font-extrabold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-md shrink-0"
                    >
                      Skopírované
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <hr className="border-white/10" />

              {/* Email */}
              <div className="flex items-center gap-4 group">
                <button 
                  onClick={() => copyToClipboard('mojkrok@dcza.sk', 'email')}
                  className="w-12 h-12 bg-white/5 text-gold border border-white/10 rounded-xl flex items-center justify-center shrink-0 hover:bg-white/10 hover:border-gold/30 group-hover:scale-105 transition-all cursor-pointer relative"
                  title="Kopírovať email"
                >
                  {copiedField === 'email' ? <Check size={20} className="text-green-400" /> : <Mail size={24} />}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-zinc-400 text-xs tracking-wider uppercase">E-mail</h4>
                  <a href="mailto:mojkrok@dcza.sk" className="font-bold text-white hover:text-gold transition-colors block text-base truncate">
                    mojkrok@dcza.sk
                  </a>
                </div>
                <AnimatePresence>
                  {copiedField === 'email' && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-green-400 font-extrabold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-md shrink-0"
                    >
                      Skopírované
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Fakturačné údaje a Bankový účet */}
            <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl hover:border-white/15 hover:bg-white/8 transition-all space-y-5 shadow-xl">
              {/* Fakturačné info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/5 text-gold border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={24} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="col-span-2">
                    <h4 className="font-extrabold text-gold text-xs tracking-wider uppercase mb-1">Fakturačné údaje</h4>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">IČO</span>
                    <span className="font-bold text-white text-sm">52 60 18 97</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">DIČ</span>
                    <span className="font-bold text-white text-sm">21 21 13 90 42</span>
                  </div>
                </div>
              </div>

              <hr className="border-white/10" />

              {/* Bankový účet Fio banky pre priame milodary */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 text-gold border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <Landmark size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-extrabold text-zinc-400 text-xs tracking-wider uppercase">Bankový účet (FIO banka)</h4>
                    <span className="text-xs text-zinc-400 font-light block mt-0.5">Pre priame milodary mimo portálu</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between gap-3 group relative overflow-hidden">
                  <div className="min-w-0">
                    <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">IBAN kód</span>
                    <span className="font-mono font-bold text-xs text-zinc-200 break-all select-all block mt-0.5">
                      SK04 8330 0000 0029 0168 8673
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard('SK0483300000002901688673', 'iban')}
                    className="p-2 px-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                    title="Kopírovať IBAN"
                  >
                    {copiedField === 'iban' ? (
                      <>
                        <Check size={14} className="text-green-400" />
                        <span className="text-xs font-bold text-green-400">Skopírované!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-zinc-300" />
                        <span className="text-xs font-bold">Kopírovať</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* PRAVÝ STĹPEC: Kontaktný formulár */}
          <div className="lg:col-span-7">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl relative">
              
              {/* Form header gradient bar */}
              <div className="bg-gradient-to-r from-blue to-blue-deep px-8 py-6 text-white flex items-center gap-3 border-b border-white/5">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                  <MessageSquare size={20} className="text-gold" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Napíšte nám správu</h2>
                  <p className="text-xs text-zinc-300 font-light mt-0.5">Máte otázku alebo pripomienku? Radi odpovieme.</p>
                </div>
              </div>

              {/* Form & Success State */}
              <div className="p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  {successMsg ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center py-12 space-y-6"
                    >
                      <div className="w-20 h-20 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-sm animate-pulse">
                        <Check size={40} className="animate-bounce" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-extrabold text-white">Správa bola odoslaná!</h3>
                        <p className="text-zinc-300 max-w-md mx-auto leading-relaxed font-light text-sm">
                          {successMsg}
                        </p>
                      </div>
                      <button
                        onClick={() => setSuccessMsg(null)}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue to-blue-deep hover:from-blue hover:to-blue/90 border border-white/10 text-white rounded-full font-bold shadow-md transition-all cursor-pointer"
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
                          className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-300"
                        >
                          <AlertCircle className="shrink-0 mt-0.5 text-red-400" size={18} />
                          <div className="text-sm font-semibold">{errorMsg}</div>
                        </motion.div>
                      )}

                      {/* Fields grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        
                        {/* Name input */}
                        <div className="space-y-2">
                          <label htmlFor="contact-name" className="text-xs font-black uppercase tracking-wider text-zinc-400 block">
                            Vaše meno
                          </label>
                          <input
                            id="contact-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="napr. Ján Kováč"
                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all disabled:opacity-60 text-sm font-medium"
                          />
                        </div>

                        {/* Email input */}
                        <div className="space-y-2">
                          <label htmlFor="contact-email" className="text-xs font-black uppercase tracking-wider text-zinc-400 block">
                            Váš e-mail
                          </label>
                          <input
                            id="contact-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="napr. jan.kovac@example.com"
                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all disabled:opacity-60 text-sm font-medium"
                          />
                        </div>

                        {/* Subject input */}
                        <div className="col-span-1 sm:col-span-2 space-y-2">
                          <label htmlFor="contact-subject" className="text-xs font-black uppercase tracking-wider text-zinc-400 block">
                            Predmet
                          </label>
                          <input
                            id="contact-subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="napr. Otázka k donátorstvu / Potvrdenie pre dane"
                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all disabled:opacity-60 text-sm font-medium"
                          />
                        </div>

                        {/* Message input */}
                        <div className="col-span-1 sm:col-span-2 space-y-2">
                          <label htmlFor="contact-message" className="text-xs font-black uppercase tracking-wider text-zinc-400 block">
                            Vaša správa <span className="text-zinc-500 font-normal lowercase">(nepovinná)</span>
                          </label>
                          <textarea
                            id="contact-message"
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Sem napíšte text vašej otázky alebo podnetu..."
                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-500 focus:bg-white/8 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all disabled:opacity-60 resize-none text-sm font-medium"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-blue to-blue-deep hover:from-blue hover:to-blue/90 border border-white/10 text-white font-bold rounded-2xl shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:pointer-events-none group"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Odosiela sa...
                          </>
                        ) : (
                          <>
                            Odoslať správu
                            <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform text-gold" />
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
    </div>
  )
}
