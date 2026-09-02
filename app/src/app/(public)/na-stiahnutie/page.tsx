import { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { FileText, FileType2, Download, Palette, BookOpen, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Na stiahnutie | KROK – Pastoračný fond Žilinskej diecézy',
  description:
    'Dokumenty a materiály na stiahnutie – darovacia zmluva, súhlas so SIPO inkasom, výročné správy a logotyp pastoračného fondu KROK.',
  openGraph: {
    title: 'Na stiahnutie | KROK',
    description: 'Dokumenty, výročné správy a logotyp pastoračného fondu KROK na stiahnutie.',
    type: 'website',
  },
}

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DownloadFile {
  label: string
  url: string
}

interface DownloadItem {
  id: string
  category: 'document' | 'annual_report' | 'logo'
  title: string
  description: string | null
  year: number | null
  image_url: string | null
  files: DownloadFile[]
  sort_order: number
}

export default async function NaStiahnutiePage() {
  const { data, error } = await supabaseAdmin
    .from('downloads')
    .select('*')
    .eq('visible', true)
    .order('year', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Chyba pri načítaní položiek na stiahnutie:', error)
  }

  const items = (data || []) as DownloadItem[]
  const documents = items.filter((i) => i.category === 'document')
  const annualReports = items.filter((i) => i.category === 'annual_report')
  const logos = items.filter((i) => i.category === 'logo')

  return (
    <div className="relative -mt-24 lg:-mt-32 bg-blue-deep min-h-screen text-white pb-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-36 sm:pt-44">
        {/* Hlavička */}
        <header className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-bright mb-4">
            Materiály
          </p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Na stiahnutie</h1>
          <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed">
            Dokumenty potrebné pre darcov, výročné správy a oficiálny logotyp pastoračného fondu
            KROK.
          </p>
        </header>

        {/* Dokumenty */}
        {documents.length > 0 && (
          <section className="mb-20">
            <h2 className="text-sm font-black uppercase tracking-widest border-l-4 border-gold pl-4 text-gold-bright mb-8">
              Dokumenty
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {documents.map((doc) => {
                const file = doc.files[0]
                if (!file) return null
                return (
                  <a
                    key={doc.id}
                    href={file.url}
                    download
                    className="group flex items-start gap-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-gold/40 rounded-2xl p-5 transition-all"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center">
                      <FileText size={22} className="text-gold-bright" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate">{doc.title}</h3>
                        <span className="text-[10px] font-black tracking-wider text-gold-bright/80 border border-gold/30 rounded px-1.5 py-0.5">
                          {file.label}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-blue-100/60 mt-1 leading-relaxed">
                          {doc.description}
                        </p>
                      )}
                    </div>
                    <Download
                      size={18}
                      className="flex-shrink-0 text-blue-100/40 group-hover:text-gold-bright transition-colors mt-1"
                    />
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* Výročné správy */}
        {annualReports.length > 0 && (
          <section className="mb-20">
            <h2 className="text-sm font-black uppercase tracking-widest border-l-4 border-gold pl-4 text-gold-bright mb-4 flex items-center gap-2">
              Výročné správy
            </h2>
            <p className="text-blue-100/60 text-sm mb-8 max-w-2xl flex items-start gap-2">
              <BookOpen size={16} className="text-gold-bright flex-shrink-0 mt-0.5" />
              Prehľad hospodárenia a činnosti fondu KROK za jednotlivé roky.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {annualReports.map((report) => {
                const pdf = report.files[0]
                return (
                  <div
                    key={report.id}
                    className="group flex flex-col bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-gold/40 rounded-2xl overflow-hidden transition-all"
                  >
                    {/* Titulka správy */}
                    <div className="relative overflow-hidden aspect-video border-b border-white/5 bg-white/[0.03]">
                      {report.image_url ? (
                        <img
                          src={report.image_url}
                          alt={report.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-100/30">
                          <BookOpen className="w-12 h-12" />
                        </div>
                      )}
                      {report.year && (
                        <span className="absolute top-4 right-4 bg-blue-deep/85 backdrop-blur px-2.5 py-1 rounded-xl text-gold-bright text-xs font-black tracking-wider shadow-md border border-gold/30 select-none">
                          {report.year}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-6">
                      <h3 className="text-lg font-extrabold text-white leading-snug mb-2 group-hover:text-gold-bright transition-colors">
                        {report.title}
                      </h3>
                      {report.description && (
                        <p className="text-sm text-blue-100/60 leading-relaxed mb-4">
                          {report.description}
                        </p>
                      )}
                      {pdf && (
                        <div className="mt-auto pt-2">
                          <a
                            href={pdf.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gold hover:bg-gold-bright text-blue-deep rounded-xl text-sm font-extrabold shadow-lg transition-all"
                          >
                            Otvoriť PDF
                            <ExternalLink size={15} className="shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Logotyp */}
        {logos.length > 0 && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest border-l-4 border-gold pl-4 text-gold-bright mb-4 flex items-center gap-2">
              Logotyp
            </h2>
            <p className="text-blue-100/60 text-sm mb-8 max-w-2xl flex items-start gap-2">
              <Palette size={16} className="text-gold-bright flex-shrink-0 mt-0.5" />
              Logotyp je základným prvkom vizuálneho štýlu fondu KROK. Používajte ho prosím v
              pôvodných farbách a proporciách.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {logos.map((set) => (
                <div
                  key={set.id}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="bg-white p-8 flex items-center justify-center h-44">
                    {set.image_url ? (
                      <img
                        src={set.image_url}
                        alt={set.title}
                        className="max-h-28 w-auto object-contain"
                      />
                    ) : (
                      <Palette className="w-12 h-12 text-gray-300" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white">{set.title}</h3>
                    {set.description && (
                      <p className="text-sm text-blue-100/60 mt-1 mb-4">{set.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {set.files.map((f, i) => (
                        <a
                          key={`${f.url}-${i}`}
                          href={f.url}
                          download
                          className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-gold/20 border border-white/10 hover:border-gold/40 text-blue-50 rounded-lg px-3 py-1.5 transition-all"
                        >
                          <FileType2 size={13} />
                          {f.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
