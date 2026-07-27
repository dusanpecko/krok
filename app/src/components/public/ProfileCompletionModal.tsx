'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeProfile } from '@/app/(public)/profil/actions'
import { X, Phone, MapPin, Landmark, Heart, Loader2, Check } from 'lucide-react'

interface Option { id: string; name: string }
interface Donor {
  phone?: string | null
  city?: string | null
  parish_id?: string | null
  street?: string | null
  postal_code?: string | null
}

const DONATION_TIERS = [
  { id: '4', label: '1 káva týždenne', amount: 4 },
  { id: '8', label: '2 kávy týždenne', amount: 8 },
  { id: '30', label: '1 káva denne', amount: 30 },
  { id: 'custom', label: 'Iná suma', amount: null },
]

const DISMISS_KEY = 'krok_profile_prompt_dismissed'

export default function ProfileCompletionModal({
  donor,
  parishes,
  projects,
}: {
  donor: Donor
  parishes: Option[]
  projects: Option[]
}) {
  const router = useRouter()

  // Profil je „neúplný", ak chýbajú kľúčové kontaktné údaje
  const incomplete = !donor.phone && !donor.city && !donor.parish_id
  const dismissed = typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1'
  const [open, setOpen] = useState(incomplete && !dismissed)

  const [phone, setPhone] = useState(donor.phone || '')
  const [street, setStreet] = useState(donor.street || '')
  const [city, setCity] = useState(donor.city || '')
  const [postalCode, setPostalCode] = useState(donor.postal_code || '')
  const [parishId, setParishId] = useState(donor.parish_id || '')
  const [tier, setTier] = useState('8')
  const [customAmount, setCustomAmount] = useState('')
  const [projectId, setProjectId] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const skip = () => {
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setOpen(false)
  }

  const save = async () => {
    setError(null)
    let donation_program = ''
    let custom_amount: number | null = null
    if (tier === 'custom') {
      const parsed = parseFloat(customAmount.replace(',', '.'))
      if (customAmount && (isNaN(parsed) || parsed <= 0)) {
        setError('Zadajte platnú sumu, alebo zvoľte iný program.')
        return
      }
      if (!isNaN(parsed) && parsed > 0) { donation_program = 'Čiastku si volím sám'; custom_amount = parsed }
    } else {
      const t = DONATION_TIERS.find(x => x.id === tier)
      if (t) { donation_program = `${t.label} (${t.amount} €)` }
    }

    setLoading(true)
    try {
      const res = await completeProfile({
        phone, street, city, postal_code: postalCode,
        parish_id: parishId || null,
        donation_program,
        custom_amount,
        project_id: projectId || null,
      })
      if (res.success) {
        try { window.localStorage.setItem(DISMISS_KEY, '1') } catch {}
        setOpen(false)
        router.refresh()
      } else {
        setError(res.error || 'Nepodarilo sa uložiť údaje.')
      }
    } catch {
      setError('Vyskytla sa neočakávaná chyba.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Doplňte svoj profil</h2>
            <p className="text-xs text-gray-500 mt-0.5">Všetko je dobrovoľné – môžete doplniť aj neskôr.</p>
          </div>
          <button onClick={skip} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Zavrieť">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}

          {/* Kontakt */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Phone size={15} /> Kontakt a adresa</h3>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefón" className={inputCls} />
            <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Ulica a číslo" className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Mesto / obec" className={inputCls} />
              <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="PSČ" className={inputCls} />
            </div>
          </div>

          {/* Farnosť */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Landmark size={15} /> Farnosť</h3>
            <select value={parishId} onChange={e => setParishId(e.target.value)} className={inputCls}>
              <option value="">— Nezvolená —</option>
              {parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Darcovský program */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Heart size={15} /> Darcovský program</h3>
            <div className="grid grid-cols-2 gap-2">
              {DONATION_TIERS.map(t => (
                <button type="button" key={t.id} onClick={() => setTier(t.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${tier === t.id ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {t.label}{t.amount ? ` · ${t.amount} €` : ''}
                </button>
              ))}
            </div>
            {tier === 'custom' && (
              <input type="text" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="Suma v € / mesiac" className={inputCls} />
            )}
          </div>

          {/* Projekt */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><MapPin size={15} /> Podporený projekt</h3>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
              <option value="">— Všeobecná podpora —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl">
          <button onClick={skip} className="text-sm text-gray-500 hover:text-gray-700 font-medium">Doplním neskôr</button>
          <button onClick={save} disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-60">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Ukladám...</> : <><Check size={16} /> Uložiť údaje</>}
          </button>
        </div>
      </div>
    </div>
  )
}
