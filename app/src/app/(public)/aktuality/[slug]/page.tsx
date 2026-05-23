import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Volume2, ArrowLeft, Newspaper } from 'lucide-react'

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
    <div className="min-h-screen bg-[#FAF9F6] pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Back Link */}
        <div className="mb-8 select-none">
          <Link 
            href="/aktuality" 
            className="inline-flex items-center gap-2 text-xs font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            Späť na aktuality
          </Link>
        </div>

        {/* Article Layout */}
        <article className="space-y-8">
          
          {/* Hlavička */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 select-none">
              <Calendar className="w-3.5 h-3.5" />
              <span>Publikované: {new Date(post.published_at || post.created_at).toLocaleDateString('sk-SK')}</span>
            </div>
          </div>

          {/* ElevenLabs Audio Player */}
          {post.audio_url && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-4 shadow-sm relative overflow-hidden select-none">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/10 shrink-0">
                  <Volume2 size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest">Hlasové predčítanie</h4>
                  <p className="text-[10px] text-blue-700/80 font-bold mt-0.5">Profesionálny rečník Sam v3</p>
                </div>
              </div>
              <audio src={post.audio_url} controls className="w-full h-10 rounded-xl" />
            </div>
          )}

          {/* Titulný obrázok */}
          {post.featured_image ? (
            <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-md aspect-video">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            // Pekný textový placeholder, ak titulka chýba
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full" />
          )}

          {/* Samotný text príspevku */}
          <div 
            className="pt-4 border-t border-gray-100 simple-rich-editor font-medium text-gray-700 leading-relaxed max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

        </article>
      </div>
    </div>
  )
}
