'use client'

import Link from 'next/link'
import { Plus, Newspaper, Edit, ExternalLink } from 'lucide-react'
import { formatDate, type ProjectPostSummary } from '@/lib/projects/types'
import { SectionTitle, btnPrimary, cardCls } from './ui'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  published: { label: 'Zverejnené', cls: 'bg-green-100 text-green-700' },
  draft: { label: 'Koncept', cls: 'bg-yellow-100 text-yellow-700' },
  archived: { label: 'Archív', cls: 'bg-gray-100 text-gray-600' },
}

export default function ProjectPostsTab({ projectId, posts }: { projectId: string; posts: ProjectPostSummary[] }) {
  return (
    <div className={`${cardCls} space-y-5`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionTitle
          title={`Správy o priebehu (${posts.length})`}
          description="Články z Aktualít naviazané na túto výzvu. Zobrazujú sa na stránke výzvy v sekcii „Ako pokračujeme“ a zároveň medzi aktualitami."
        />
        <Link href={`/admin/aktuality/new?project=${projectId}`} className={btnPrimary}>
          <Plus size={16} /> Nová správa k výzve
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="py-10 text-center text-gray-400 space-y-2">
          <Newspaper size={32} className="mx-auto text-gray-300" />
          <p className="text-sm italic">Zatiaľ žiadne správy. Napíšte darcom, ako projekt pokračuje.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {posts.map((p) => {
            const st = STATUS_LABEL[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <li key={p.id} className="flex items-center gap-3 p-4 bg-white hover:bg-blue-50/30 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Newspaper size={16} /></span>
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/aktuality/${p.id}`} className="font-bold text-gray-900 hover:text-blue-700 block truncate">{p.title}</Link>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${st.cls}`}>{st.label}</span>
                    <span>{p.published_at ? formatDate(p.published_at) : 'nezverejnené'}</span>
                  </div>
                </div>
                {p.status === 'published' && (
                  <Link href={`/aktuality/${p.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg" title="Zobraziť na webe"><ExternalLink size={16} /></Link>
                )}
                <Link href={`/admin/aktuality/${p.id}`} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg" title="Upraviť"><Edit size={16} /></Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
