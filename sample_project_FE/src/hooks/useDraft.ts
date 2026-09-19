import { useCallback, useEffect, useRef, useState } from 'react'

const PREFIX = 'diary.draft.'
const SAVE_DELAY_MS = 700

export interface Draft<T> {
  values: T
  savedAt: number
}

function read<T>(key: string): Draft<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && 'values' in parsed && 'savedAt' in parsed) {
      return parsed as Draft<T>
    }
  } catch {
    /* unreadable or unavailable storage — treat as no draft */
  }
  return null
}

/**
 * Holds an unfinished card in local storage while it is being typed.
 * The draft never reaches the server; it exists so a closed tab does not
 * throw away ten minutes of writing.
 */
export function useDraft<T>(key: string, isDirty: boolean) {
  const [restored] = useState(() => read<T>(key))
  const [savedAt, setSavedAt] = useState<number | null>(() => restored?.savedAt ?? null)
  const timer = useRef<number | undefined>(undefined)

  const save = useCallback(
    (values: T) => {
      if (!isDirty) return
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        const at = Date.now()
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify({ values, savedAt: at }))
          setSavedAt(at)
        } catch {
          /* storage unavailable — writing continues, it is just not held */
        }
      }, SAVE_DELAY_MS)
    },
    [key, isDirty],
  )

  const clear = useCallback(() => {
    window.clearTimeout(timer.current)
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      /* nothing to clear */
    }
    setSavedAt(null)
  }, [key])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { restored, savedAt, save, clear }
}
