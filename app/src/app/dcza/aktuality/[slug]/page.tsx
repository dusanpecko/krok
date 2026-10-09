import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPost, getPosts } from '@/lib/diocese/public'
import { longDate } from '@/lib/diocese/format'
import PostCard from '@/components/dcza/PostCard'
import ShareButton from '@/components/parishes/ShareButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug)
  if (!post) return { title: 'Článok nenájdený' }
  return { title: post.title, description: post.excerpt ?? undefined, openGraph: { title: post.title, description: post.excerpt ?? undefined, type: 'article', ...(post.image_url ? { images: [{ url: post.image_url }] } : {}) } }
}

export default async function DczaPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()
  const related = (await getPosts({ limit: 4, category: post.categories[0]?.slug ?? null })).filter((p) => p.id !== post.id).slice(0, 3)
  // obrázok v perexe, ak ho už neobsahuje text článku
  const showImage = post.image_url && !(post.content ?? '').includes(post.image_url)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <article className="max-w-3xl mx-auto">
        <Link href={post.categories[0] ? `/aktuality?kategoria=${post.categories[0].slug}` : '/aktuality'} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-6">
          <ArrowLeft size={14} /> {post.categories[0]?.name ?? 'Aktuality'}
        </Link>
        <h1 className="text-3xl sm:text-5xl font-light tracking-tight leading-tight">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-mute">
          <span>{longDate(post.published_at)}</span>
          <ShareButton path={`/aktuality/${post.slug}`} title={post.title} className="text-blue" />
        </div>
        {post.excerpt && <p className="mt-6 text-xl text-ink/80 leading-relaxed">{post.excerpt}</p>}
        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url!} alt="" className="mt-8 w-full rounded-3xl" />
        )}
        {post.content && <div className="dcza-prose mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />}
        <div className="mt-12 pt-6 border-t border-blue/10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mute">Páčil sa vám článok? Pošlite ho ďalej.</p>
          <ShareButton path={`/aktuality/${post.slug}`} title={post.title} text={post.excerpt ? `${post.title}\n${post.excerpt}` : post.title} bare align="right" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue text-white font-extrabold text-sm hover:bg-blue/90 cursor-pointer" />
        </div>
      </article>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-light mb-5">Ďalšie články</h2>
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
