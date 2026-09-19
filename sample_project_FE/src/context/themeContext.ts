import { createContext } from 'react'

/** The cabinet stands in one of two lights. */
export type Theme = 'night' | 'day'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export const THEME_STORAGE_KEY = 'diary.theme'
