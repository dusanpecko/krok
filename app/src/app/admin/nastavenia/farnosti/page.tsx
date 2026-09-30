import { redirect } from 'next/navigation'

/** Správa farností sa presunula do samostatného modulu /admin/farnosti (návrh farností § 6.1). */
export default function LegacyParishSettingsPage() {
  redirect('/admin/farnosti')
}
