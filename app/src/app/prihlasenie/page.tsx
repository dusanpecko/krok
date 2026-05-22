'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  sidebar: '#002D72',
}

function LoginForm() {
  const { supabase, session, sessionChecked } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ak je už prihlásený, presmeruj
  useEffect(() => {
    if (sessionChecked && session) {
      router.replace(redirect)
    }
  }, [session, sessionChecked, router, redirect])

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
        router.replace(redirect)
      }
    } catch {
      setError('Nastala neočakávaná chyba. Skúste to znova.')
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
          <div className="mb-8">
            <h1 className="text-5xl font-black text-white tracking-wider">
              KR<span style={{ color: KROK.yellow }}>O</span>K
            </h1>
            <div className="mt-3 h-0.5 w-24 mx-auto" style={{ backgroundColor: KROK.yellow }} />
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
            <h1 className="text-3xl font-black tracking-wider" style={{ color: KROK.blue }}>
              KR<span style={{ color: KROK.yellow }}>O</span>K
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Administrácia</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3"
                   style={{ background: `linear-gradient(135deg, ${KROK.blue}, ${KROK.lightBlue})` }}>
                <Lock size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Prihlásenie</h2>
              <p className="text-sm text-gray-400 mt-1">Vstúpte do admin zóny KROK</p>
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
                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg disabled:opacity-60"
                style={{ backgroundColor: KROK.blue }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Prihlasujem...
                  </>
                ) : (
                  <>
                    Prihlásiť sa <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
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
