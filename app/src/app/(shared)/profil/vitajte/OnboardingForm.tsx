'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, AlertCircle, Church, Heart } from 'lucide-react'
import { saveOnboarding } from '../actions'
import { NO_PARISH } from '@/lib/parishes/constants'

interface Option {
  id: string
  name: string
}

const selectCls =
  'w-full px-4 py-3.5 bg-white border border-blue/10 rounded-2xl text-ink text-sm font-medium outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer'

export default function OnboardingForm({ firstName, parishes, projects, next, initialParishId = null }: { firstName: string; parishes: Option[]; projects: Option[]; next: string; initialParishId?: string | null }) {
  const [parishId, setParishId] = useState(initialParishId ?? '')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parishId) {
      setError('Vyberte svoju farnosť, prípadne možnosť „Nepatrím do žiadnej farnosti“.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await saveOnboarding({ parish_id: parishId, project_id: projectId || null })
    if (!res.success) {
      setError(res.error)
      setSaving(false)
      return
    }
    window.location.assign(next)
  }

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-paper-warm text-ink min-h-screen overflow-hidden flex items-center justify-center px-4 pt-40 pb-24">
      <div className="grain" />
      <div className="absolute inset-0 bg-radial-[at_center_top] from-blue-soft via-paper-warm to-paper-warm z-0" />
      <form onSubmit={submit} className="relative z-10 w-full max-w-lg bg-white border border-blue/10 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <span className="px-4 py-1.5 rounded-full border border-gold/25 bg-gold/5 text-blue text-xs tracking-widest uppercase font-extrabold">
            Vitajte{firstName ? `, ${firstName}` : ''}
          </span>
          <h1 className="text-3xl font-light mt-5">Ešte jeden krok</h1>
          <p className="text-ink/80 text-sm leading-relaxed font-light mt-3">
            Povedzte nám, z ktorej farnosti ste. Váš dar sa tak započíta aj do príspevku vašej farnosti do fondu.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="onb-parish" className="text-xs font-black uppercase tracking-wider text-mute flex items-center gap-2">
            <Church size={14} className="text-gold-ink" /> Moja farnosť <span className="text-gold-ink">*</span>
          </label>
          <select id="onb-parish" value={parishId} onChange={(e) => setParishId(e.target.value)} className={selectCls} required>
            <option value="" className="bg-white">Vyberte farnosť…</option>
            {parishes.map((p) => (
              <option key={p.id} value={p.id} className="bg-white">{p.name}</option>
            ))}
            <option value={NO_PARISH} className="bg-white">Nepatrím do žiadnej farnosti / podporujem projekt</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="onb-project" className="text-xs font-black uppercase tracking-wider text-mute flex items-center gap-2">
            <Heart size={14} className="text-gold-ink" /> Podporujem projekt <span className="normal-case tracking-normal font-medium text-mute">(nepovinné)</span>
          </label>
          <select id="onb-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
            <option value="" className="bg-white">Fond KROK všeobecne</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-white">{p.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="flex items-start gap-2 text-sm text-red-300 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? 'Ukladám…' : <>Pokračovať <ArrowRight size={16} /></>}
        </button>
        <p className="text-[11px] text-mute text-center">Farnosť aj projekt si môžete kedykoľvek zmeniť vo svojom profile.</p>
      </form>
    </div>
  )
}
