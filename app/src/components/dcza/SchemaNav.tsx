import Link from 'next/link'

const ITEMS = [
  { href: '/schematizmus/knazi', label: 'Kňazi a diakoni' },
  { href: '/schematizmus/kuria', label: 'Kúria' },
  { href: '/schematizmus/dekanaty', label: 'Dekanáty' },
  { href: '/farnosti', label: 'Farnosti' },
  { href: '/o-nas/schematizmus/rehole', label: 'Rehole' },
  { href: '/schematizmus/zomreli', label: 'Zomrelí kňazi' },
]

/** Podmenu schematizmu. */
export default function SchemaNav({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2 mb-8">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className={`px-4 py-2 rounded-xl text-sm font-bold ${active === i.href ? 'bg-blue text-white' : 'bg-white border border-blue/15 text-ink/80 hover:border-blue/40'}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  )
}
