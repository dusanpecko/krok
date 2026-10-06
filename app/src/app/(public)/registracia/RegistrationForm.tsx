'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { User2, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, MailCheck, Loader2, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import DonationSection from '@/components/public/DonationSection'
import { getRegistrationFormOptions } from './actions'
import { NO_PARISH } from '@/lib/parishes/constants'

// Tmavé polia formulára v štýle webu (rovnaké ako kontaktný formulár)
const inputCls =
  'w-full py-3.5 bg-white border border-blue/10 rounded-2xl text-ink placeholder:text-mute/70 focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all disabled:opacity-60 text-sm font-medium'
const labelCls = 'text-xs font-black uppercase tracking-wider text-mute block mb-2'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.53c0,-0.29 -0.03,-0.57 -0.08,-0.84Z" fill="#4285F4" />
      <path d="M12,20.68c2.43,0 4.47,-0.81 5.96,-2.21l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.3,1.02c-2.33,0.08 -4.38,-1.48 -5.09,-3.66l-3.41,2.64c1.69,3.35 5.17,5.78 9.14,5.78Z" fill="#34A853" />
      <path d="M6.91,13.26c-0.18,-0.54 -0.28,-1.12 -0.28,-1.71c0,-0.59 0.1,-1.17 0.28,-1.71l-3.41,-2.64c-0.63,1.26 -0.99,2.69 -0.99,4.21c0,1.52 0.36,2.95 0.99,4.21l3.41,-2.67Z" fill="#FBBC05" />
      <path d="M12,6.09c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58c-1.56,-1.45 -3.59,-2.34 -6.02,-2.34c-3.97,0 -7.45,2.43 -9.14,5.78l3.41,2.64c0.71,-2.18 2.76,-3.74 5.09,-3.66Z" fill="#EA4335" />
    </svg>
  )
}

export default function RegistrationForm({ initialParishId = null, parishSlug = null }: { initialParishId?: string | null; parishSlug?: string | null }) {
  const { supabase } = useSupabase()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [consent, setConsent] = useState(false)
  // Farnosť (povinná voľba – aj „nepatrím do farnosti“) a podporovaný projekt (nepovinné)
  const [parishId, setParishId] = useState(initialParishId ?? '')
  const [projectId, setProjectId] = useState('')
  const [options, setOptions] = useState<{ parishes: { id: string; name: string }[]; projects: { id: string; name: string }[] }>({ parishes: [], projects: [] })
  useEffect(() => {
    getRegistrationFormOptions().then(setOptions).catch(() => {})
  }, [])

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
    if (!parishId) {
      setError('Vyberte svoju farnosť, prípadne možnosť „Nepatrím do žiadnej farnosti“.')
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
          // farnosť a projekt overí server pri založení profilu (getCurrentDonor)
          data: { first_name: fn, last_name: ln, full_name: `${fn} ${ln}`, parish_id: parishId, project_id: projectId || null },
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
        // pri príchode zo stránky farnosti sa farnosť prenesie až do onboardingu
        options: { redirectTo: `${window.location.origin}/auth/callback${parishSlug ? `?redirect=${encodeURIComponent(`/profil?farnost=${parishSlug}`)}` : ''}` },
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
      <div className="relative -mt-24 lg:-mt-32 bg-paper-warm text-ink min-h-screen overflow-hidden flex items-center justify-center px-4 pt-40 pb-24">
        <div className="grain" />
        <div className="absolute inset-0 bg-radial-[at_center_top] from-blue-soft via-paper-warm to-paper-warm z-0" />
        <div className="relative z-10 w-full max-w-md bg-white border border-blue/10 backdrop-blur-sm rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5 bg-gold/15 border border-gold/30 text-gold-ink">
            <MailCheck size={26} />
          </div>
          <h2 className="text-2xl font-light text-ink">Skontrolujte si e-mail</h2>
          <p className="text-sm text-ink/80 mt-3 leading-relaxed font-light">
            Na adresu <span className="font-semibold text-ink">{email}</span> sme poslali
            potvrdzovací odkaz. Kliknutím naň dokončíte registráciu a budete prihlásený.
          </p>
          <p className="text-xs text-mute mt-4">
            E-mail neprišiel? Skontrolujte priečinok spam alebo skúste registráciu znova.
          </p>
          <Link href="/prihlasenie" className="inline-block mt-6 text-sm font-extrabold text-blue hover:text-blue">
            Prejsť na prihlásenie →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-paper-warm text-ink font-sans selection:bg-gold-bright/35 selection:text-ink overflow-hidden">
      <div className="grain" />
      <div className="absolute inset-x-0 top-0 h-[900px] bg-radial-[at_center_top] from-blue-soft via-paper-warm to-paper-warm z-0 pointer-events-none" />
      <div className="absolute top-[8%] left-[5%] w-[60vw] h-[40vh] rounded-full bg-blue/5 blur-[130px] pointer-events-none z-0" />

      {/* HERO + REGISTRÁCIA */}
      <section className="relative z-10 pt-36 pb-20 sm:pt-40 lg:pt-48 px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="px-4 py-1.5 rounded-full border border-gold/25 bg-gold/5 text-blue text-xs tracking-widest uppercase font-extrabold">
            Registrácia
          </span>
          <h1 className="text-4xl sm:text-5xl font-light text-ink leading-tight mt-6">
            Staňte sa súčasťou <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue via-blue via-60% to-gold-ink font-extrabold">
              rodiny darcov.
            </span>
          </h1>
          <p className="text-ink/80 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-light mt-5">
            S účtom získate vlastný variabilný symbol, prehľad svojich darov a potvrdenia.
            Ostatné údaje doplníte neskôr vo svojom profile – vždy dobrovoľne.
          </p>
        </div>

        <div className="max-w-md mx-auto bg-white border border-blue/10 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-300">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Najrýchlejšia cesta – Google hore */}
          <button type="button" onClick={handleGoogleRegister} disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-800 font-extrabold text-sm flex items-center justify-center gap-3 transition-all shadow-lg cursor-pointer disabled:opacity-60">
            <GoogleIcon />
            Registrovať sa cez Google
          </button>

          <div className="flex items-center gap-3 my-6 text-[10px] uppercase tracking-widest text-mute font-extrabold">
            <div className="flex-1 h-px bg-blue-soft/60" /> alebo e-mailom <div className="flex-1 h-px bg-blue-soft/60" />
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-first" className={labelCls}>Meno</label>
                <div className="relative">
                  <User2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                  <input id="reg-first" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className={`${inputCls} pl-10 pr-3`} placeholder="Jozef" required autoComplete="given-name" />
                </div>
              </div>
              <div>
                <label htmlFor="reg-last" className={labelCls}>Priezvisko</label>
                <input id="reg-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className={`${inputCls} px-4`} placeholder="Kováč" required autoComplete="family-name" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className={labelCls}>E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`${inputCls} pl-10 pr-4`} placeholder="jozef@email.sk" required autoComplete="email" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-pass" className={labelCls}>Heslo</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input id="reg-pass" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pl-10 pr-11`} placeholder="Aspoň 8 znakov" required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-mute hover:text-ink">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-pass2" className={labelCls}>Potvrdenie hesla</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input id="reg-pass2" type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={`${inputCls} pl-10 pr-4`} placeholder="Zopakujte heslo" required autoComplete="new-password" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-parish" className={labelCls}>Moja farnosť <span className="text-gold-ink">*</span></label>
              <select id="reg-parish" value={parishId} onChange={(e) => setParishId(e.target.value)} required
                className={`${inputCls} px-4 cursor-pointer`}>
                <option value="" className="bg-white">Vyberte farnosť…</option>
                {options.parishes.map((p) => <option key={p.id} value={p.id} className="bg-white">{p.name}</option>)}
                <option value={NO_PARISH} className="bg-white">Nepatrím do žiadnej farnosti / podporujem projekt</option>
              </select>
            </div>

            <div>
              <label htmlFor="reg-project" className={labelCls}>Podporujem projekt <span className="normal-case tracking-normal font-medium text-mute">(nepovinné)</span></label>
              <select id="reg-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className={`${inputCls} px-4 cursor-pointer`}>
                <option value="" className="bg-white">Fond KROK všeobecne</option>
                {options.projects.map((p) => <option key={p.id} value={p.id} className="bg-white">{p.name}</option>)}
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-blue/20 bg-white accent-gold" />
              <span className="text-xs text-mute leading-relaxed">
                Súhlasím so spracovaním osobných údajov pre účely darcovského programu KROK.
              </span>
            </label>

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold text-sm rounded-2xl shadow-xl hover:shadow-gold/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 border border-gold/20">
              {loading ? (<><Loader2 size={16} className="animate-spin" /> Registrujem...</>) : (<>Zaregistrovať sa <ArrowRight size={16} /></>)}
            </button>
          </form>

          <p className="text-center text-xs text-mute mt-6">
            Už máte účet?{' '}
            <Link href="/prihlasenie" className="font-extrabold text-gold-ink hover:text-blue">Prihláste sa</Link>
          </p>
        </div>

        {/* Odkaz na darovanie bez registrácie */}
        <div className="text-center mt-10">
          <a href="#darovat" className="inline-flex items-center gap-2 text-sm text-ink/80 hover:text-ink font-medium">
            Chcete len darovať, bez registrácie? <ArrowDown size={16} className="text-gold-ink" />
          </a>
        </div>
      </section>

      {/* DAR BEZ REGISTRÁCIE (anonymne) – rovnaká platobná brána ako na domovskej stránke */}
      <DonationSection
        id="darovat"
        kicker="Bez registrácie"
        title={<>Darujte aj <br />anonymne</>}
        subtitle="Účet nie je podmienkou. Zaplaťte kartou cez platobnú bránu alebo pošlite dar prevodom – meno vyplniť nemusíte."
      />
    </div>
  )
}
