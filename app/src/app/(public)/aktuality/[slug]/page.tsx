import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Volume2, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PublicPostDetailPage({ params }: PageProps) {
  const { slug } = await params

  // Načítame príspevok z databázy podľa slug-u
  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !post) {
    notFound()
  }

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      {/* Dekoratívne svetelné pozadie */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        {/* Späť na aktuality */}
        <div className="mb-8 select-none">
          <Link
            href="/aktuality"
            className="inline-flex items-center gap-2 text-xs font-black text-blue-100/50 hover:text-gold-bright transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            Späť na aktuality
          </Link>
        </div>

        {/* Článok */}
        <article className="space-y-8">
          {/* Hlavička */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-tight tracking-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-100/50 select-none">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Publikované:{' '}
                {new Date(
                  post.published_at || post.created_at
                ).toLocaleDateString('sk-SK')}
              </span>
            </div>
          </div>

          {/* Hlasové predčítanie */}
          {post.audio_url && (
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4 relative overflow-hidden select-none">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-gold/15 border border-gold/25 text-gold-bright flex items-center justify-center shrink-0">
                  <Volume2 size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gold-bright uppercase tracking-widest">
                    Hlasové predčítanie
                  </h4>
                  <p className="text-[10px] text-blue-100/60 font-bold mt-0.5">
                    Profesionálny rečník Sam v3
                  </p>
                </div>
              </div>
              <audio
                src={post.audio_url}
                controls
                className="w-full h-10 rounded-xl"
              />
            </div>
          )}

          {/* Titulný obrázok */}
          {post.featured_image ? (
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            // Zlatá deliaca linka, ak titulka chýba
            <div className="h-1 bg-gradient-to-r from-blue via-gold to-gold-bright rounded-full" />
          )}

          {/* Samotný text príspevku */}
          <div
            className="theme-dark simple-rich-editor pt-4 border-t border-white/10 leading-relaxed max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  )
}
