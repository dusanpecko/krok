import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, HandHeart } from 'lucide-react'
import { getKrokPost, getPosts, KROK_CATEGORY } from '@/lib/diocese/public'
import { longDate } from '@/lib/diocese/format'
import { getBaseUrl } from '@/lib/mollie/client'
import PostCard from '@/components/dcza/PostCard'
import ShareButton from '@/components/parishes/ShareButton'

export const dynamic = 'force-dynamic'

/** Aktualita Kroku zobrazená na dcza.sk (O74) – hlavná adresa pre vyhľadávače ostáva na mojkrok.sk. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getKrokPost((await params).slug)
  if (!post) return { title: 'Článok nenájdený' }
  const canonical = `${getBaseUrl()}/aktuality/${post.slug}`
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical },
    openGraph: { title: post.title, description: post.excerpt ?? undefined, type: 'article', url: canonical, ...(post.image_url ? { images: [{ url: post.image_url }] } : {}) },
  }
}

export default async function DczaKrokPost({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getKrokPost((await params).slug)
  if (!post) notFound()
  const related = (await getPosts({ limit: 4, category: KROK_CATEGORY.slug })).filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <article className="max-w-3xl mx-auto">
        <Link href={`/aktuality?kategoria=${KROK_CATEGORY.slug}`} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
          <ArrowLeft size={14} /> {KROK_CATEGORY.name}
        </Link>
        <h1 className="text-3xl sm:text-5xl font-light tracking-tight leading-tight">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-mute">
          <span>{longDate(post.published_at)}</span>
          <ShareButton path={`/aktuality/krok/${post.slug}`} title={post.title} className="text-blue" />
        </div>
        {post.excerpt && <p className="mt-6 text-xl text-ink/80 leading-relaxed">{post.excerpt}</p>}
        {post.audio_url && (
          <audio src={post.audio_url} controls preload="none" className="mt-6 w-full">
            Váš prehliadač nepodporuje prehrávanie zvuku.
          </audio>
        )}
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" className="mt-8 w-full rounded-3xl" />
        )}
        {post.content && <div className="dcza-prose mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />}

        <aside className="mt-12 rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-6 sm:p-8 flex flex-wrap items-center gap-5">
          <HandHeart className="text-gold-ink shrink-0" size={36} />
          <div className="flex-1 min-w-[220px]">
            <p className="font-extrabold">KROK – Pastoračný fond Žilinskej diecézy</p>
            <p className="text-sm text-mute">Malé pravidelné dary, ktoré spolu nesú pastoráciu v našej diecéze.</p>
          </div>
          <a href="https://mojkrok.sk" className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-blue text-white font-extrabold text-sm hover:bg-blue/90">
            Viac na mojkrok.sk <ExternalLink size={14} />
          </a>
        </aside>
      </article>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-light mb-5">Ďalšie aktuality Kroku</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
