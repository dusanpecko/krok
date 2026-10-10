import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { HelpArticle } from '@/lib/help'
import { parseVideoUrl, videoEmbedUrl } from '@/lib/parishes/video'
import { protectEmails } from '@/lib/email-code'

/** Detail návodu + odkazy na ďalšie návody tej istej zóny. */
export default function HelpArticleView({ article, base, others }: { article: HelpArticle; base: string; others: Pick<HelpArticle, 'slug' | 'title'>[] }) {
  const video = article.video_url ? parseVideoUrl(article.video_url) : null
  const updated = new Date(article.updated_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-8 items-start">
      <article className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <Link href={base} className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600 mb-4">
          <ArrowLeft size={15} /> Všetky návody
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{article.title}</h1>
        {article.summary && <p className="text-gray-500 mt-2">{article.summary}</p>}
        {video && (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 mt-6">
            <iframe
              src={videoEmbedUrl(video).replace('autoplay=1', 'autoplay=0')}
              title={`Video: ${article.title}`}
              className="absolute inset-0 w-full h-full"
              allow="fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              loading="lazy"
            />
          </div>
        )}
        {!article.published && <p className="mt-3 inline-block px-3 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold">Skrytý návod – vidia ho len správcovia</p>}
        <div className="simple-rich-editor leading-relaxed mt-6 pt-6 border-t border-gray-100" dangerouslySetInnerHTML={{ __html: protectEmails(article.content) }} />
        <p className="mt-8 text-xs text-gray-400">Aktualizované {updated}</p>
      </article>
      {others.length > 0 && (
        <aside className="bg-white rounded-3xl border border-gray-100 p-5 lg:sticky lg:top-6">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Ďalšie návody</p>
          <ul className="space-y-1">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`${base}/${o.slug}`} className="flex items-center justify-between gap-2 py-1.5 text-sm text-gray-700 hover:text-blue-600">
                  {o.title} <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}
