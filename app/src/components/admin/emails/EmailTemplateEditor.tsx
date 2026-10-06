'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Home, Mail, Save, Send, Code, Type, CheckCircle2, XCircle } from 'lucide-react'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import {
  EMAIL_VARIABLE_HELP,
  SAMPLE_EMAIL_VARIABLES,
  renderTemplate,
  wrapEmailLayout,
  type EmailTemplate,
} from '@/lib/email/render'
import { sendTestEmail, updateEmailTemplate, type EmailLogRow, type EmailTemplateUpdate } from '@/app/admin/emaily/actions'

interface Props {
  initial: EmailTemplate
  logs: EmailLogRow[]
}

/** Prepínače podmienených blokov v náhľade */
const PREVIEW_FLAGS: { key: string; label: string }[] = [
  { key: 'is_recurring', label: 'Pravidelný dar' },
  { key: 'is_registered', label: 'Darca má účet' },
  { key: 'has_name', label: 'Poznáme meno' },
]

const inputCls =
  'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all'
const labelCls = 'block text-xs font-black text-gray-400 uppercase tracking-widest pl-1 mb-2'

function varName(v: string) {
  return v.replace(/[{}#^/]/g, '')
}

export default function EmailTemplateEditor({ initial, logs }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<EmailTemplateUpdate>({
    subject: initial.subject,
    body: initial.body,
    from_email: initial.from_email,
    from_name: initial.from_name,
    reply_to: initial.reply_to,
    is_active: initial.is_active,
  })
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const [flags, setFlags] = useState<Record<string, boolean>>({ is_recurring: false, is_registered: true, has_name: true })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const set = <K extends keyof EmailTemplateUpdate>(key: K, value: EmailTemplateUpdate[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setMessage(null)
  }

  const usedFlags = PREVIEW_FLAGS.filter((f) => form.body.includes(`{{#${f.key}}}`) || form.body.includes(`{{^${f.key}}}`) || form.subject.includes(`{{#${f.key}}}`))

  const preview = useMemo(() => {
    const vars = { ...SAMPLE_EMAIL_VARIABLES, ...flags }
    return {
      subject: renderTemplate(form.subject, vars, { html: false }),
      html: wrapEmailLayout(renderTemplate(form.body, vars, { html: true }), { siteUrl: String(SAMPLE_EMAIL_VARIABLES.site_url) }),
    }
  }, [form.subject, form.body, flags])

  const handleSave = async () => {
    setSaving(true)
    const res = await updateEmailTemplate(initial.id, form)
    setSaving(false)
    setMessage(res.success ? { type: 'success', text: 'Šablóna je uložená.' } : { type: 'error', text: res.error })
    if (res.success) router.refresh()
  }

  const handleTest = async () => {
    setSending(true)
    const res = await sendTestEmail(initial.template_key, form)
    setSending(false)
    setMessage(
      res.success
        ? { type: 'success', text: `Testovací e-mail s ukážkovými údajmi bol odoslaný na ${res.to}.` }
        : { type: 'error', text: `Test sa nepodarilo odoslať: ${res.error}` }
    )
    router.refresh()
  }

  const copyVariable = async (v: string) => {
    const name = varName(v)
    const text = v.includes('#') ? `{{#${name}}}…{{/${name}}}` : `{{${name}}}`
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: 'success', text: `Skopírované: ${text}` })
    } catch {
      setMessage({ type: 'error', text: 'Kopírovanie sa nepodarilo – premennú prepíšte ručne.' })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link href="/admin" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <Link href="/admin/emaily" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Mail size={12} /> E-mailové šablóny
        </Link>
        <ChevronRight size={12} />
        <span className="text-gray-900">{initial.name}</span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{initial.name}</h1>
          <p className="text-gray-500 mt-1">{initial.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="w-4 h-4" />
            Aktívna
          </label>
          <button
            onClick={handleTest}
            disabled={sending || saving}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send size={16} /> {sending ? 'Odosielam…' : 'Poslať test mne'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || sending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} /> {saving ? 'Ukladám…' : 'Uložiť'}
          </button>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl text-sm font-medium border ${
            message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {!form.is_active && (
        <div className="px-4 py-3 rounded-xl text-sm border bg-amber-50 border-amber-200 text-amber-800">
          Šablóna je vypnutá – tento e-mail sa darcom neposiela (test funguje).
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Úprava */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <label className={labelCls}>Predmet e-mailu</label>
              <input type="text" value={form.subject} onChange={(e) => set('subject', e.target.value)} className={inputCls} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={labelCls + ' mb-0'}>Obsah e-mailu</span>
                <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setMode('visual')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer ${mode === 'visual' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                  >
                    <Type size={14} /> Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('html')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer ${mode === 'html' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                  >
                    <Code size={14} /> HTML
                  </button>
                </div>
              </div>
              {mode === 'visual' ? (
                <SimpleRichTextEditor label="" value={form.body} onChange={(v) => set('body', v)} minHeight="320px" />
              ) : (
                <textarea
                  value={form.body}
                  onChange={(e) => set('body', e.target.value)}
                  rows={18}
                  className={inputCls + ' font-mono text-xs'}
                />
              )}
              <p className="text-xs text-gray-500 mt-2">
                Hlavičku KROK a pätičku s kontaktom pridáme automaticky. Pre odkaz napíšte text, označte ho a ako adresu zadajte premennú,
                napr. <code>{'{{profile_url}}'}</code>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-900 mb-1">Dostupné premenné</h3>
            <p className="text-xs text-gray-500 mb-4">Kliknutím premennú skopírujete a vložíte do predmetu alebo textu.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {initial.available_variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => copyVariable(v)}
                  className="text-left bg-gray-50 hover:bg-blue-50 rounded-xl px-3 py-2 transition-colors cursor-pointer"
                >
                  <code className="text-sm text-blue-700">{v.includes('#') ? `{{#${varName(v)}}}…{{/${varName(v)}}}` : v}</code>
                  <span className="block text-xs text-gray-500">{EMAIL_VARIABLE_HELP[varName(v)] ?? ''}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Blok <code>{'{{#is_recurring}}…{{/is_recurring}}'}</code> sa zobrazí len vtedy, keď podmienka platí;{' '}
              <code>{'{{^is_recurring}}…{{/is_recurring}}'}</code> naopak len vtedy, keď neplatí.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-900 mb-4">Odosielateľ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Meno odosielateľa</label>
                <input type="text" value={form.from_name} onChange={(e) => set('from_name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>E-mail odosielateľa</label>
                <input type="email" value={form.from_email} onChange={(e) => set('from_email', e.target.value)} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Odpovede posielať na (nepovinné)</label>
                <input
                  type="email"
                  value={form.reply_to ?? ''}
                  onChange={(e) => set('reply_to', e.target.value)}
                  placeholder="mojkrok@dcza.sk"
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">E-mail odosielateľa musí byť overený v Brevo (Senders), inak sa e-mail neodošle.</p>
          </div>
        </div>

        {/* Náhľad */}
        <div className="space-y-4 xl:sticky xl:top-6 self-start">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-black text-gray-900">Náhľad s ukážkovými údajmi</h3>
              {usedFlags.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {usedFlags.map((f) => (
                    <label key={f.key} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!flags[f.key]}
                        onChange={(e) => setFlags((s) => ({ ...s, [f.key]: e.target.checked }))}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Predmet: <span className="font-bold text-gray-900">{preview.subject}</span>
            </p>
            <iframe
              title="Náhľad e-mailu"
              srcDoc={preview.html}
              sandbox=""
              className="w-full h-[640px] rounded-2xl border border-gray-100 bg-gray-50"
            />
          </div>

          {logs.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-gray-900 mb-3">Posledné odoslania</h3>
              <ul className="space-y-2 text-sm">
                {logs.map((l) => (
                  <li key={l.id} className="flex items-start gap-2">
                    {l.status === 'sent' ? (
                      <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="text-gray-900">{l.recipient_email}</span>
                      {l.is_test && <span className="ml-2 text-[10px] font-black uppercase text-amber-600">test</span>}
                      <span className="block text-xs text-gray-500">
                        {new Date(l.created_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })}
                      </span>
                      {l.error_message && <span className="block text-xs text-red-600">{l.error_message}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
