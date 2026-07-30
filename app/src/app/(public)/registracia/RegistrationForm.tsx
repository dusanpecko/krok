'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { User2, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, MailCheck, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  yellow: '#FFD100',
  sidebar: '#002D72',
}

export default function RegistrationForm() {
  const { supabase } = useSupabase()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [consent, setConsent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validácia
    if (!firstName.trim() || !lastName.trim()) {
      setError('Prosím, vyplňte meno aj priezvisko.')
      return
    }
    if (!email.trim()) {
      setError('Prosím, zadajte e-mail.')
      return
    }
    if (password.length < 8) {
      setError('Heslo musí mať aspoň 8 znakov.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Heslá sa nezhodujú.')
      return
    }
    if (!consent) {
      setError('Pre registráciu je potrebný súhlas so spracovaním osobných údajov.')
      return
    }

    setLoading(true)
    try {
      const fn = firstName.trim()
      const ln = lastName.trim()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { first_name: fn, last_name: ln, full_name: `${fn} ${ln}` },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('Účet s týmto e-mailom už existuje. Skúste sa prihlásiť.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      // Ak je zapnuté overenie e-mailu (odporúčané), session ešte nie je –
      // používateľ musí potvrdiť e-mail. Ak je overenie vypnuté a session
      // existuje, presmerujeme rovno cez post-login.
      if (data.session) {
        window.location.assign('/auth/post-login')
        return
      }
      setEmailSent(true)
    } catch {
      setError('Vyskytla sa neočakávaná chyba. Skúste to prosím neskôr.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError('Nepodarilo sa spustiť registráciu cez Google.')
    } finally {
      setLoading(false)
    }
  }

  // Stav po odoslaní – čaká sa na potvrdenie e-mailu
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-28 pb-12 bg-gray-50 -mt-24 lg:-mt-32">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
               style={{ background: `linear-gradient(135deg, ${KROK.blue}, ${KROK.lightBlue})` }}>
            <MailCheck size={26} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Skontrolujte si e-mail</h2>
          <p className="text-sm text-gray-500 mt-3">
            Na adresu <span className="font-semibold text-gray-700">{email}</span> sme poslali
            potvrdzovací odkaz. Kliknutím naň dokončíte registráciu a budete prihlásený.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            E-mail neprišiel? Skontrolujte priečinok spam alebo skúste registráciu znova.
          </p>
          <Link href="/prihlasenie" className="inline-block mt-6 text-sm font-semibold" style={{ color: KROK.blue }}>
            Prejsť na prihlásenie
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex -mt-24 lg:-mt-32">
      {/* Ľavá strana – branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center items-center relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${KROK.sidebar} 0%, ${KROK.blue} 50%, ${KROK.lightBlue} 100%)` }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10 text-center px-12">
          <div className="mb-8 flex flex-col items-center">
            <Image src="/logo/logo_w.webp" alt="KROK – Pastoračný fond Žilinskej diecézy" width={97} height={56} className="mx-auto" priority />
            <div className="mt-4 h-0.5 w-24 mx-auto" style={{ backgroundColor: KROK.yellow }} />
          </div>
          <p className="text-lg text-blue-100/90 font-medium max-w-sm">Staňte sa súčasťou rodiny darcov</p>
          <p className="text-sm text-blue-200/70 mt-3 max-w-xs mx-auto">
            Zaregistrujte sa jednoducho e-mailom alebo cez Google. Ostatné údaje doplníte
            neskôr vo svojom profile – vždy dobrovoľne.
          </p>
        </div>
      </div>

      {/* Pravá strana – formulár */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 pt-32 pb-12 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <Image src="/logo/logo_c.webp" alt="KROK" width={69} height={40} className="mx-auto" priority />
            <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest">Registrácia</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Vytvorte si účet</h2>
              <p className="text-sm text-gray-400 mt-1">Registrácia do fondu KROK</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Meno</label>
                  <div className="relative">
                    <User2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties} placeholder="Jozef" required autoComplete="given-name" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priezvisko</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties} placeholder="Kováč" required autoComplete="family-name" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties} placeholder="jozef@email.sk" required autoComplete="email" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Heslo</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties} placeholder="Aspoň 8 znakov" required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Potvrdenie hesla</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties} placeholder="Zopakujte heslo" required autoComplete="new-password" />
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300" />
                <span className="text-xs text-gray-500 leading-relaxed">
                  Súhlasím so spracovaním osobných údajov pre účely darcovského programu KROK.
                </span>
              </label>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: KROK.blue }}>
                {loading ? (<><Loader2 size={16} className="animate-spin" /> Registrujem...</>) : (<>Zaregistrovať sa <ArrowRight size={16} /></>)}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-400 tracking-wider">
                <span className="bg-white px-3">Alebo</span>
              </div>
            </div>

            <button type="button" onClick={handleGoogleRegister} disabled={loading}
              className="w-full py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-3 transition-all hover:shadow-md cursor-pointer disabled:opacity-60">
              <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.53c0,-0.29 -0.03,-0.57 -0.08,-0.84Z" fill="#4285F4" />
                <path d="M12,20.68c2.43,0 4.47,-0.81 5.96,-2.21l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.3,1.02c-2.33,0.08 -4.38,-1.48 -5.09,-3.66l-3.41,2.64c1.69,3.35 5.17,5.78 9.14,5.78Z" fill="#34A853" />
                <path d="M6.91,13.26c-0.18,-0.54 -0.28,-1.12 -0.28,-1.71c0,-0.59 0.1,-1.17 0.28,-1.71l-3.41,-2.64c-0.63,1.26 -0.99,2.69 -0.99,4.21c0,1.52 0.36,2.95 0.99,4.21l3.41,-2.67Z" fill="#FBBC05" />
                <path d="M12,6.09c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58c-1.56,-1.45 -3.59,-2.34 -6.02,-2.34c-3.97,0 -7.45,2.43 -9.14,5.78l3.41,2.64c0.71,-2.18 2.76,-3.74 5.09,-3.66Z" fill="#EA4335" />
              </svg>
              Registrovať sa cez Google
            </button>

            <p className="text-center text-xs text-gray-400 mt-6">
              Už máte účet?{' '}
              <Link href="/prihlasenie" className="font-semibold" style={{ color: KROK.blue }}>Prihláste sa</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
