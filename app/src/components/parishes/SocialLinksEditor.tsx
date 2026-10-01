'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import SocialIcon from './SocialIcon'
import { MAX_SOCIAL_LINKS, SOCIAL_KINDS, guessSocialKind, type SocialKind, type SocialLink } from '@/lib/parishes/social'
import { btnPrimary, btnSecondary, cardCls, inputCls, Notice, SectionTitle } from '@/components/admin/projects/ui'

type Save = (parishId: string, links: SocialLink[]) => Promise<{ success: true } | { success: false; error: string }>

/** Sociálne siete farnosti – zobrazia sa na stránke farnosti pod „Farský úrad“ (zóna farnosti aj admin). */
export default function SocialLinksEditor({ parishId, initial, save }: { parishId: string; initial: SocialLink[]; save: Save }) {
  const router = useRouter()
  const [links, setLinks] = useState<SocialLink[]>(initial)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const update = (i: number, patch: Partial<SocialLink>) => setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const submit = () =>
    startTransition(async () => {
      const res = await save(parishId, links)
      if (res.success) {
        setMsg({ kind: 'success', text: 'Uložené.' })
        router.refresh()
      } else setMsg({ kind: 'error', text: res.error })
    })

  return (
    <div className={`${cardCls} space-y-4`}>
      <SectionTitle title="Sociálne siete a odkazy" description="YouTube, Facebook, Instagram, TikTok, fotogaléria… Zobrazia sa na stránke farnosti pod farským úradom. Ukladajú sa hneď." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {links.length === 0 && <p className="text-sm text-gray-400">Zatiaľ žiadne odkazy.</p>}
      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={i} className="flex flex-wrap md:flex-nowrap items-center gap-2">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">
              <SocialIcon kind={l.kind} colored />
            </span>
            <select value={l.kind} onChange={(e) => update(i, { kind: e.target.value as SocialKind })} className={`${inputCls} md:!w-56`}>
              {SOCIAL_KINDS.map((k) => (
                <option key={k.key} value={k.key}>{k.label}</option>
              ))}
            </select>
            <input
              value={l.url}
              onChange={(e) => {
                const url = e.target.value
                const guess = guessSocialKind(url)
                update(i, { url, ...(guess && l.kind === 'other' && !l.label ? { kind: guess } : {}) })
              }}
              placeholder={SOCIAL_KINDS.find((k) => k.key === l.kind)?.placeholder}
              className={inputCls}
            />
            <input
              value={l.label ?? ''}
              onChange={(e) => update(i, { label: e.target.value || null })}
              placeholder={l.kind === 'other' ? 'Popis (povinný)' : 'Popis (nepovinný)'}
              className={`${inputCls} md:!w-48`}
              maxLength={40}
            />
            <button type="button" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`} aria-label="Odstrániť">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" disabled={links.length >= MAX_SOCIAL_LINKS} onClick={() => setLinks((ls) => [...ls, { kind: 'other', url: '', label: null }])} className={btnSecondary}>
          <Plus size={14} /> Pridať odkaz
        </button>
        <button type="button" onClick={submit} disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Uložiť odkazy
        </button>
      </div>
    </div>
  )
}
