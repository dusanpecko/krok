import Link from 'next/link'
import { Archive, FileSpreadsheet, FileText, Paperclip, Sparkles } from 'lucide-react'
import { fmtDate, isNewDoc, type ZoneDocSummary, type ZoneSearchHit } from '@/lib/clergy-zone/types'

/** Riadok dokumentu v zozname / výsledkoch hľadania. */
export default function DocCard({ doc, showCategory = false }: { doc: ZoneDocSummary | ZoneSearchHit; showCategory?: boolean }) {
  const snippets = 'snippets' in doc ? doc.snippets : []
  const sheet = doc.files.length > 0 && doc.files.every((f) => /\.(xlsx?|ods|csv)$/i.test(f.file_name))
  return (
    <Link href={`/knazska-zona/dokument/${doc.id}`} className="group block rounded-2xl bg-white border border-blue/10 p-5 hover:border-gold/50 hover:shadow-sm transition-all">
      <div className="flex gap-4">
        <div className="w-11 h-11 rounded-xl bg-blue-soft/30 text-blue flex items-center justify-center shrink-0">{sheet ? <FileSpreadsheet size={20} /> : <FileText size={20} />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1 text-xs">
            {showCategory && <span className="font-black uppercase tracking-wider text-blue">{doc.category_name}</span>}
            {doc.doc_number && <span className="font-bold text-mute">č. {doc.doc_number}</span>}
            {doc.issued_on && <span className="text-mute">{fmtDate(doc.issued_on)}</span>}
            {isNewDoc(doc.published_at) && (
              <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-ink font-black inline-flex items-center gap-1">
                <Sparkles size={11} /> Nové
              </span>
            )}
            {doc.status === 'archived' && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-mute font-bold inline-flex items-center gap-1">
                <Archive size={11} /> Archív
              </span>
            )}
          </div>
          <p className="font-extrabold text-lg leading-snug group-hover:text-blue">{doc.title}</p>
          {doc.summary && <p className="text-sm text-mute mt-1 line-clamp-2">{doc.summary}</p>}
          {snippets.map((s, i) => (
            <p key={i} className="mt-2 text-sm text-ink/80 leading-relaxed border-l-2 border-gold/50 pl-3">
              {s.parts.map((p, j) => (p.hit ? <mark key={j} className="bg-gold/30 text-ink rounded px-0.5">{p.text}</mark> : <span key={j}>{p.text}</span>))}
              <span className="block text-xs text-mute mt-0.5">{s.source}</span>
            </p>
          ))}
          {doc.files.length > 0 && (
            <p className="mt-2 text-xs text-mute inline-flex items-center gap-1.5">
              <Paperclip size={12} /> {doc.files.map((f) => f.file_name).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
