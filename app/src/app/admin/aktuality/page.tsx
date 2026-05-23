import { getPosts } from './actions'
import Link from 'next/link'
import { Plus, Newspaper, Calendar, FileText, Volume2, Edit, Trash2 } from 'lucide-react'
import DeletePostButton from '@/components/admin/aktuality/DeletePostButton'

export const dynamic = 'force-dynamic'

export default async function AdminAktualityPage() {
  const posts = await getPosts()

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-blue-600" />
            Aktuality a články
          </h1>
          <p className="text-sm text-gray-500 font-medium">Správa a publikovanie oznamov, správ a duchovných zamyslení pastoračného fondu KROK.</p>
        </div>
        <Link href="/admin/aktuality/new">
          <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            Pridať článok
          </button>
        </Link>
      </div>

      {/* Grid zoznamu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="group relative flex flex-col justify-between bg-white border border-gray-100 rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:border-blue-500/30 overflow-hidden"
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none">
              <FileText className="w-28 h-28 text-blue-900 rotate-12 -mr-8 -mt-8" />
            </div>

            <div className="space-y-4 relative z-10">
              {/* Vizuálny badge */}
              <div className="flex justify-between items-start">
                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border ${
                  post.status === 'published'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : post.status === 'archived'
                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                    : 'bg-gray-50 border-gray-100 text-gray-600'
                }`}>
                  {post.status === 'published' ? 'Zverejnené' : post.status === 'archived' ? 'Archivované' : 'Koncept'}
                </span>
                
                {/* Audio Status */}
                {post.audio_url && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm animate-pulse" title="ElevenLabs audio nahrávka je pripravená">
                    <Volume2 size={12} className="shrink-0" />
                    TTS Hlas
                  </div>
                )}
              </div>

              {/* Obsah karty */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-lg leading-tight text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('sk-SK') : 'Dátum neurčený'}
                </div>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 min-h-[3rem]">
                {post.excerpt || 'Tento článok nemá zatiaľ vyplnený žiadny krátky úryvok pre zoznamy...'}
              </p>
            </div>

            {/* Dolná lišta akcií */}
            <div className="pt-4 mt-6 border-t border-gray-50 flex items-center justify-between relative z-10">
              <Link href={`/admin/aktuality/${post.id}`}>
                <button className="flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-800 transition-colors bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-xl cursor-pointer">
                  <Edit size={12} />
                  Upraviť
                </button>
              </Link>
              <DeletePostButton id={post.id} title={post.title} />
            </div>
          </div>
        ))}

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white shadow-sm max-w-xl mx-auto w-full">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
              <Newspaper className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1">Zatiaľ žiadne články</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto font-medium">
              Vytvorte svoj prvý oznam alebo článok. Bude zobrazený pre darcov na verejnej stránke s podporou predčítania textu.
            </p>
            <Link href="/admin/aktuality/new">
              <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/10 cursor-pointer">
                Vytvoriť prvý článok
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
