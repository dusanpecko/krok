import type { ParishTheme } from './types'
import { standardTheme } from './standard'

/**
 * Register motívov stránok farností (O29). Ďalší motív: pridať priečinok s Home / PostList / PostDetail,
 * zaradiť ho sem a do meta.ts (výber v zóne farnosti sa zobrazí od dvoch motívov).
 */
export const PARISH_THEMES: Record<string, ParishTheme> = {
  [standardTheme.key]: standardTheme,
}

export const DEFAULT_PARISH_THEME = standardTheme.key

export function getParishTheme(key: string | null | undefined): ParishTheme {
  return (key && PARISH_THEMES[key]) || PARISH_THEMES[DEFAULT_PARISH_THEME]
}
