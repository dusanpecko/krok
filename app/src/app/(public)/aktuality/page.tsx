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
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      {/* Dekoratívne svetelné pozadie */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gold/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        {/* Hlavička */}
        <header className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright mb-4">
            Farský spravodajca
          </p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">
            Aktuality a duchovné slovo
          </h1>
          <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed">
            Sledujte najnovšie informácie, výzvy a inšpirujúce články z
            pastoračného fondu KROK Žilinskej diecézy.
          </p>
        </header>

        {/* Mriežka článkov */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePosts.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col justify-between bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-gold/40 rounded-2xl overflow-hidden transition-all"
            >
              <div>
                {/* Ilustračný obrázok */}
                <Link
                  href={`/aktuality/${post.slug}`}
                  className="block overflow-hidden aspect-video relative"
                >
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    // Diecézny gradient ako placeholder
                    <div className="w-full h-full bg-gradient-to-br from-blue/40 to-blue-deep flex items-center justify-center text-blue-100/30 border-b border-white/5">
                      <Newspaper className="w-12 h-12" />
                    </div>
                  )}

                  {/* Audio odznak na obrázku */}
                  {post.audio_url && (
                    <div className="absolute bottom-4 right-4 bg-blue-deep/85 backdrop-blur px-2.5 py-1 rounded-xl text-gold-bright text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-gold/30 select-none">
                      <Volume2 size={12} className="shrink-0" />
                      Predčítanie
                    </div>
                  )}
                </Link>

                {/* Obsah karty */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-100/50 select-none">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(
                        post.published_at || post.created_at
                      ).toLocaleDateString('sk-SK')}
                    </span>
                  </div>

                  <Link href={`/aktuality/${post.slug}`} className="block">
                    <h2 className="text-lg font-extrabold text-white leading-snug group-hover:text-gold-bright transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="text-sm text-blue-100/60 leading-relaxed line-clamp-3">
                    {post.excerpt ||
                      'Otvorte detail článku pre úplné informácie a spustenie hlasového predčítania...'}
                  </p>
                </div>
              </div>

              {/* Spodná časť / Odkaz na čítanie */}
              <div className="px-6 pb-6 pt-2 select-none">
                <Link
                  href={`/aktuality/${post.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gold-bright/90 group-hover:text-gold-bright transition-all"
                >
                  Čítať článok
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </div>
            </article>
          ))}

          {/* Empty State */}
          {activePosts.length === 0 && (
            <div className="col-span-full py-16 text-center border border-white/10 rounded-2xl bg-white/[0.04] max-w-xl mx-auto w-full px-6">
              <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4 text-gold-bright/70">
                <Newspaper className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-1">
                Žiadne novinky
              </h3>
              <p className="text-sm text-blue-100/60 max-w-sm mx-auto leading-relaxed">
                V tejto chvíli nie sú zverejnené žiadne aktuality. Sledujte nás
                znova neskôr!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
