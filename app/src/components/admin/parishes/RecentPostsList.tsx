'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Ban, ExternalLink, RotateCcw } from 'lucide-react'
import { setPostTakedown, type RecentParishPost } from '@/app/admin/farnosti/web-actions'
import { btnSecondary, cardCls } from '@/components/admin/projects/ui'

export default function RecentPostsList({ posts }: { posts: RecentParishPost[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const toggle = (p: RecentParishPost, takeDown: boolean) => {
    let reason: string | undefined
    if (takeDown) {
      const r = prompt(`Stiahnuť „${p.title}“ z webu? Dôvod (uvidí ho farnosť):`)
      if (r === null) return
      reason = r
    } else if (!confirm(`Obnoviť a znova zverejniť „${p.title}“?`)) return
    startTransition(async () => {
      const res = await setPostTakedown(p.id, takeDown, reason)
      if (!res.success) alert(res.error)
      router.refresh()
    })
  }

  if (!posts.length) return <div className={`${cardCls} text-center text-sm text-gray-400 py-12`}>Žiadne príspevky.</div>

  return (
    <div className={`${cardCls} !p-0 divide-y divide-gray-100`}>
      {posts.map((p) => {
        const url = p.parish_slug ? `/farnosti/${p.parish_slug}/${p.type === 'announcement' ? 'oznamy' : 'aktuality'}/${p.slug}` : null
        return (
          <div key={p.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <p className="text-xs font-bold text-gray-400">
                <Link href={`/admin/farnosti/${p.parish_id}`} className="hover:text-blue-600">{p.parish_name}</Link>
                {' · '}{p.type === 'announcement' ? 'Oznamy' : 'Aktualita'}{' · '}{new Date(p.published_at ?? p.updated_at).toLocaleString('sk-SK')}
              </p>
              <p className="font-bold text-gray-900">{p.title}</p>
              {p.taken_down_at ? (
                <p className="text-xs text-red-600 font-bold">Stiahnuté {new Date(p.taken_down_at).toLocaleDateString('sk-SK')}{p.takedown_reason ? ` – ${p.takedown_reason}` : ''}</p>
              ) : (
                p.excerpt && <p className="text-xs text-gray-500 line-clamp-2">{p.excerpt}</p>
              )}
            </div>
            {url && !p.taken_down_at && (
              <a href={url} target="_blank" rel="noopener noreferrer" className={btnSecondary}><ExternalLink size={14} /> Zobraziť</a>
            )}
            {p.taken_down_at ? (
              <button type="button" disabled={pending} onClick={() => toggle(p, false)} className={btnSecondary}><RotateCcw size={14} /> Obnoviť</button>
            ) : (
              <button type="button" disabled={pending} onClick={() => toggle(p, true)} className={`${btnSecondary} hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700`}><Ban size={14} /> Stiahnuť</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
