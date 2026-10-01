/** Zoznam motívov bez komponentov – pre klienta (výber motívu) a validáciu na serveri (O29). */
export const PARISH_THEME_OPTIONS: { key: string; label: string; description: string }[] = [
  { key: 'standard', label: 'Štandardný', description: 'Tmavomodrý vzhľad KROK so zlatými akcentmi.' },
]

export const isParishTheme = (key: string) => PARISH_THEME_OPTIONS.some((t) => t.key === key)
