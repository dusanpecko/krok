import Link from 'next/link'
import { ChevronRight, Home, Mail, CheckCircle2, XCircle } from 'lucide-react'
import { getEmailTemplates, getRecentEmailLogs } from './actions'
import { EMAIL_CATEGORY_LABELS } from '@/lib/email/render'

export const dynamic = 'force-dynamic'

function fmtDateTime(d: string | null) {
  return d ? new Date(d).toLocaleString('sk-SK', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Bratislava' }) : '—'
}

export default async function EmailTemplatesPage() {
  const [templates, logs] = await Promise.all([getEmailTemplates(), getRecentEmailLogs()])
  const names = new Map(templates.map((t) => [t.template_key, t.name]))

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Link href="/admin" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={12} /> Admin
        </Link>
        <ChevronRight size={12} />
        <div className="flex items-center gap-1">
          <Mail size={12} /> <span className="text-gray-900">E-mailové šablóny</span>
        </div>
      </nav>

      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">E-mailové šablóny</h1>
        <p className="text-gray-500 mt-1">
          Texty automatických e-mailov. Upravíte ich bez programovania – premenné ako <code className="text-blue-700">{'{{first_name}}'}</code> či{' '}
          <code className="text-blue-700">{'{{amount}}'}</code> sa pri odoslaní nahradia skutočnými údajmi.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center text-gray-500">
          Žiadne šablóny. Spustite migráciu <code>040_email_templates.sql</code>.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Šablóna</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Kategória</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Stav</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Odoslané</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Naposledy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <Link href={`/admin/emaily/${t.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                      {t.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1 max-w-md">{t.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Predmet: {t.subject}</p>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">{EMAIL_CATEGORY_LABELS[t.category] ?? t.category}</td>
                  <td className="px-6 py-5">
                    {t.is_active ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">Aktívna</span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">Vypnutá</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-gray-900">{t.sent_count}</td>
                  <td className="px-6 py-5 text-sm text-gray-500">{fmtDateTime(t.last_sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-black text-gray-900">Posledné odoslané e-maily</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">Zatiaľ sa neodoslal žiadny e-mail.</p>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[720px] text-sm">
              <tbody className="divide-y divide-gray-50">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-6 py-3 whitespace-nowrap text-gray-500">{fmtDateTime(l.created_at)}</td>
                    <td className="px-4 py-3">
                      {l.status === 'sent' ? (
                        <CheckCircle2 size={16} className="text-green-600" aria-label="Odoslaný" />
                      ) : (
                        <XCircle size={16} className="text-red-600" aria-label="Zlyhal" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{l.recipient_email}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {names.get(l.template_key) ?? l.template_key}
                      {l.is_test && <span className="ml-2 text-[10px] font-black uppercase text-amber-600">test</span>}
                      {l.error_message && <p className="text-xs text-red-600 mt-0.5">{l.error_message}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
