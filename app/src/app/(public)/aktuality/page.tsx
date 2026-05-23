import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Calendar, Volume2, ArrowRight, Newspaper } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PublicAktualityPage() {
  // Načítame iba zverejnené aktuality zoradené zostupne
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Chyba pri načítaní verejných aktualít:', error)
  }

  const activePosts = posts || []

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Sekcia Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full select-none shadow-sm">
            Farský spravodajca
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Aktuality a duchovné slovo
          </h1>
          <p className="text-base text-gray-500 font-medium leading-relaxed">
            Sledujte najnovšie informácie, výzvy a inšpirujúce články z pastoračného fondu KROK Žilinskej diecézy.
          </p>
        </div>

        {/* Mriežka článkov */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-6">
          {activePosts.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col justify-between bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
            >
              <div>
                {/* Ilustračný obrázok */}
                <Link href={`/aktuality/${post.slug}`} className="block overflow-hidden aspect-video relative">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    // Štýlový diecézny gradient ako placeholder
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-950 flex items-center justify-center text-blue-200/50">
                      <Newspaper className="w-12 h-12" />
                    </div>
                  )}

                  {/* Audio odznak na obrázku */}
                  {post.audio_url && (
                    <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-xl text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-white/20 select-none">
                      <Volume2 size={12} className="shrink-0" />
                      Predčítanie
                    </div>
                  )}
                </Link>

                {/* Obsah karty */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 select-none">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(post.published_at || post.created_at).toLocaleDateString('sk-SK')}</span>
                  </div>

                  <Link href={`/aktuality/${post.slug}`} className="block">
                    <h2 className="text-lg font-black text-gray-900 leading-snug hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-3">
                    {post.excerpt || 'Otvorne detail článku pre úplné informácie a spustenie hlasového predčítania...'}
                  </p>
                </div>
              </div>

              {/* Spodná časť / Odkaz na čítanie */}
              <div className="px-6 pb-6 pt-2 select-none">
                <Link href={`/aktuality/${post.slug}`} className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 group-hover:text-blue-800 transition-all">
                  Čítať článok
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))}

          {/* Empty State */}
          {activePosts.length === 0 && (
            <div className="col-span-full py-16 text-center border border-gray-100 rounded-3xl bg-white shadow-sm max-w-xl mx-auto w-full px-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Newspaper className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-1">Žiadne novinky</h3>
              <p className="text-sm text-gray-400 font-bold max-w-sm mx-auto leading-relaxed">
                V tejto chvíli nie sú zverejnené žiadne aktuality. Sledujte nás znova neskôr!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
