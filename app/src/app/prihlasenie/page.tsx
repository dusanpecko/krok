'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import Image from 'next/image'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  sidebar: '#002D72',
}

function LoginForm() {
  const { supabase, session, sessionChecked } = useSupabase()
  const searchParams = useSearchParams()
  // Explicitná cieľová cesta (napr. keď middleware presmeruje z /admin).
  // Ak nie je, o cieli rozhodne /auth/post-login podľa role.
  const explicitRedirect = searchParams.get('redirect')
  const postLoginUrl = `/auth/post-login${
    explicitRedirect ? `?to=${encodeURIComponent(explicitRedirect)}` : ''
  }`

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ak je už prihlásený, presmeruj cez post-login (rozhodne podľa role)
  useEffect(() => {
    if (sessionChecked && session) {
      window.location.assign(postLoginUrl)
    }
  }, [session, sessionChecked, postLoginUrl])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Nesprávny e-mail alebo heslo.')
        } else {
          setError(authError.message)
        }
      } else {
        // Plná navigácia na server route, ktorý rozhodne cieľ podľa role
        window.location.assign(postLoginUrl)
        return
      }
    } catch {
      setError('Nastala neočakávaná chyba. Skúste to znova.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback${
            explicitRedirect ? `?redirect=${encodeURIComponent(explicitRedirect)}` : ''
          }`
        }
      })
      if (oauthError) {
        setError(oauthError.message)
      }
    } catch (err: any) {
      setError(err?.message || 'Nepodarilo sa spustiť prihlásenie cez Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Ľavá strana – branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center items-center relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${KROK.sidebar} 0%, ${KROK.blue} 50%, ${KROK.lightBlue} 100%)` }}>

        {/* Dekoratívne tvary */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full" style={{ backgroundColor: KROK.yellow, opacity: 0.1 }} />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full" style={{ backgroundColor: KROK.red, opacity: 0.1 }} />

        <div className="relative z-10 text-center px-12">
          {/* KROK Logo */}
          <div className="mb-8 flex flex-col items-center">
            <Image
              src="/logo/logo_w.webp"
              alt="KROK – Pastoračný fond Žilinskej diecézy"
              width={97}
              height={56}
              className="mx-auto"
              priority
            />
            <div className="mt-4 h-0.5 w-24 mx-auto" style={{ backgroundColor: KROK.yellow }} />
          </div>
          <p className="text-lg text-blue-100/80 font-medium">Pastoračný fond</p>
          <p className="text-sm text-blue-200/60 mt-1">Žilinskej diecézy</p>

          {/* Features */}
          <div className="mt-12 space-y-4 text-left max-w-xs mx-auto">
            {[
              'Správa darcov a ich príspevkov',
              'Import a párovanie bankových výpisov',
              'Prehľad projektov a grantov',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: KROK.yellow }} />
                <p className="text-sm text-blue-100/70">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pravá strana – formulár */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/logo/logo_c.webp"
              alt="KROK – Pastoračný fond Žilinskej diecézy"
              width={69}
              height={40}
              className="mx-auto"
              priority
            />
            <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest">Prihlásenie</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3"
                   style={{ background: `linear-gradient(135deg, ${KROK.blue}, ${KROK.lightBlue})` }}>
                <Lock size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Prihlásenie</h2>
              <p className="text-sm text-gray-400 mt-1">Vstúpte do svojej zóny KROK</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties}
                    placeholder="admin@krok.sk"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Heslo</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: KROK.blue }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Prihlasujem...
                  </>
                ) : (
                  <>
                    Prihlásiť sa e-mailom <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Separátor a prihlásenie cez Google */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-150" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-400 tracking-wider">
                <span className="bg-white px-3">Alebo</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-md cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.53c0,-0.29 -0.03,-0.57 -0.08,-0.84Z" fill="#4285F4" />
                <path d="M12,20.68c2.43,0 4.47,-0.81 5.96,-2.21l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.3,1.02c-2.33,0.08 -4.38,-1.48 -5.09,-3.66l-3.41,2.64c1.69,3.35 5.17,5.78 9.14,5.78Z" fill="#34A853" />
                <path d="M6.91,13.26c-0.18,-0.54 -0.28,-1.12 -0.28,-1.71c0,-0.59 0.1,-1.17 0.28,-1.71l-3.41,-2.64c-0.63,1.26 -0.99,2.69 -0.99,4.21c0,1.52 0.36,2.95 0.99,4.21l3.41,-2.67Z" fill="#FBBC05" />
                <path d="M12,6.09c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58c-1.56,-1.45 -3.59,-2.34 -6.02,-2.34c-3.97,0 -7.45,2.43 -9.14,5.78l3.41,2.64c0.71,-2.18 2.76,-3.74 5.09,-3.66Z" fill="#EA4335" />
              </svg>
              Prihlásiť sa cez Google
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} KROK – Pastoračný fond Žilinskej diecézy
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
