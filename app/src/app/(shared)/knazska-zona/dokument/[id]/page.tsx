import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Archive, ArrowLeft, Download, ExternalLink, FileSpreadsheet, FileText, File as FileIcon } from 'lucide-react'
import { requireZonePage } from '@/lib/clergy-zone/access'
import { getZoneDoc, listCategories } from '@/lib/clergy-zone/docs'
import { FILE_KIND_LABEL, fileKind, fmtDate, formatBytes } from '@/lib/clergy-zone/types'
import ZoneShell, { NoZoneAccess } from '@/components/clergy-zone/ZoneShell'
import { protectEmails } from '@/lib/email-code'

export const dynamic = 'force-dynamic'

export default async function ZoneDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireZonePage(`/knazska-zona/dokument/${id}`)
  if (!access) return <NoZoneAccess />
  // kúria vidí aj koncept (náhľad pred zverejnením)
  const [categories, doc] = await Promise.all([listCategories(access.db), getZoneDoc(access.db, id, { includeDrafts: access.canManage })])
  if (!doc) notFound()

  return (
    <ZoneShell access={{ name: access.name, canManage: access.canManage }} categories={categories} activeSlug={doc.category_slug}>
      <Link href={`/knazska-zona/kategoria/${doc.category_slug}${doc.status === 'archived' ? '?archiv=1' : ''}`} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue hover:underline mb-5">
        <ArrowLeft size={14} /> {doc.category_name}
      </Link>
      <article className="rounded-3xl bg-white border border-blue/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-mute mb-2">
          {doc.doc_number && <span className="font-bold">č. {doc.doc_number}</span>}
          {doc.issued_on && <span>vydané {fmtDate(doc.issued_on)}</span>}
          {doc.status === 'archived' && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 font-bold inline-flex items-center gap-1 text-xs">
              <Archive size={11} /> Archív
            </span>
          )}
        </div>
        <h2 className="text-3xl sm:text-4xl font-light leading-tight">{doc.title}</h2>
        {doc.summary && <p className="text-lg text-ink/80 mt-4 leading-relaxed">{doc.summary}</p>}

        {doc.files.length > 0 && (
          <ul className="mt-6 space-y-2">
            {doc.files.map((f) => {
              const kind = fileKind(f.file_name, f.mime_type)
              const Icon = kind === 'excel' ? FileSpreadsheet : kind === 'other' ? FileIcon : FileText
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue/10 bg-paper-warm/60 p-3 sm:p-4">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kind === 'pdf' ? 'bg-red-50 text-red-600' : kind === 'word' ? 'bg-blue-50 text-blue-700' : kind === 'excel' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon size={20} />
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-extrabold break-words">{f.file_name}</p>
                    <p className="text-xs text-mute">
                      {FILE_KIND_LABEL[kind]} · {formatBytes(f.size_bytes)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {kind === 'pdf' || kind === 'image' ? (
                      <a href={`/knazska-zona/subor/${f.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-extrabold hover:bg-blue/90">
                        <ExternalLink size={15} /> Otvoriť
                      </a>
                    ) : null}
                    <a
                      href={`/knazska-zona/subor/${f.id}?stiahnut=1`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-extrabold ${kind === 'pdf' || kind === 'image' ? 'bg-white border border-blue/20 text-blue hover:border-blue/50' : 'bg-blue text-white hover:bg-blue/90'}`}
                    >
                      <Download size={15} /> Stiahnuť
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {doc.body && <div className="simple-rich-editor leading-relaxed mt-8 pt-6 border-t border-blue/10" dangerouslySetInnerHTML={{ __html: protectEmails(doc.body) }} />}
        <p className="text-xs text-mute mt-8">Pridané {fmtDate(doc.published_at)} · {doc.category_name}</p>
      </article>
    </ZoneShell>
  )
}
