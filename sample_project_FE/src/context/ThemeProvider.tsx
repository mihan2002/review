import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEME_STORAGE_KEY, ThemeContext, type Theme } from './themeContext'

function readInitialTheme(): Theme {
  // index.html already resolved this before first paint; read it back so the
  // provider and the document never disagree.
  const attribute = document.documentElement.getAttribute('data-theme')
  if (attribute === 'day' || attribute === 'night') return attribute
  return 'night'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme === 'day' ? 'light' : 'dark'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'day' ? '#ADA492' : '#241B12')
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* storage unavailable — the choice lasts for this session only */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'night' ? 'day' : 'night'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        /* see above */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
