/**
 * Kúria, rady a komisie (migrácia 051) – spoločné typy a pravidlá pre admin aj web.
 * Kňazi sú členmi cez menovanie v registri (clergy_assignments.body_id), ostatní cez diocese_body_members.
 */

export type BodyKind = 'kuria' | 'rada' | 'usek'

export const BODY_KIND_LABEL: Record<BodyKind, string> = {
  kuria: 'Diecézna kúria',
  rada: 'Rady a komisie',
  usek: 'Pastoračné úseky',
}

export interface DioceseBody {
  id: string
  slug: string
  name: string
  name_genitive: string | null
  kind: BodyKind
  description: string | null
  sort_order: number
  published: boolean
}

/** Funkcie, ktoré samy osebe nehovoria, o aký orgán ide („člen“ → „člen Presbyterskej rady“). */
const GENERIC_ROLE = /^(člen|členka|predseda|predsedníčka|podpredseda|podpredsedníčka|tajomník|tajomníčka|moderátor|konzultant|konzultantka|koordinátor|diecézny koordinátor|diecézny riaditeľ|zodpovedný|za )/i

export const BODY_ROLE_SUGGESTIONS = ['člen', 'predseda', 'podpredseda', 'tajomník', 'konzultant', 'diecézny koordinátor']

export const isPlainMember = (role: string | null | undefined) => !role || /^člen(ka)?$/i.test(role.trim())

/** Text funkcie do registra kňaza (profil, história) z funkcie v orgáne. */
export function assignmentRoleText(bodyRole: string, body: Pick<DioceseBody, 'name' | 'name_genitive' | 'kind'>): string {
  const role = bodyRole.trim() || 'člen'
  const lower = role.toLowerCase()
  if ((body.name_genitive && lower.includes(body.name_genitive.toLowerCase())) || lower.includes(body.name.toLowerCase())) return role
  if (body.name_genitive && GENERIC_ROLE.test(role)) return `${role} ${body.name_genitive}`
  if (body.kind === 'kuria' && !GENERIC_ROLE.test(role)) return role
  return isPlainMember(role) ? `člen – ${body.name}` : `${body.name} – ${role}`
}

/** Poradie v zozname: vedúci, predseda, podpredseda, tajomník, ostatné funkcie, členovia. */
export function roleRank(role: string | null | undefined): number {
  const r = (role ?? '').toLowerCase()
  if (/^(diecézny biskup|generálny vikár|kancelár|súdny vikár|sudny vikár|ekonóm|riaditeľ|diecézny riaditeľ|diecézny koordinátor)/.test(r)) return 0
  if (/^predsed/.test(r)) return 1
  if (/^podpredsed/.test(r)) return 2
  if (/^(tajomní|moderátor)/.test(r)) return 3
  if (isPlainMember(r)) return 5
  return 4
}

export function personName(p: { title_before?: string | null; first_name?: string | null; last_name: string; title_after?: string | null }): string {
  const base = [p.title_before, p.first_name, p.last_name].filter(Boolean).join(' ')
  return p.title_after ? `${base}, ${p.title_after}` : base
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
