import { useEffect, useRef } from 'react'

export const FOCUS_SEARCH_EVENT = 'diary:focus-search'

export interface ShortcutHandlers {
  onNewEntry: () => void
  onDashboard: () => void
  onFocusSearch: () => void
  onToggleLight: () => void
  onToggleHelp: () => void
  onEscape: () => void
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

const CHORD_WINDOW_MS = 900

/** Keyboard access to the drawer. Chords follow the `g d` convention. */
export function useShortcuts(handlers: ShortcutHandlers) {
  const latest = useRef(handlers)

  // Keep the handlers current without re-binding the listener on every render.
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    let pendingChord: string | null = null
    let chordTimer = 0

    const clearChord = () => {
      pendingChord = null
      window.clearTimeout(chordTimer)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        latest.current.onEscape()
        clearChord()
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return

      if (pendingChord === 'g') {
        clearChord()
        if (event.key === 'd') {
          event.preventDefault()
          latest.current.onDashboard()
        }
        return
      }

      switch (event.key) {
        case 'g':
          pendingChord = 'g'
          chordTimer = window.setTimeout(clearChord, CHORD_WINDOW_MS)
          break
        case 'n':
          event.preventDefault()
          latest.current.onNewEntry()
          break
        case '/':
          event.preventDefault()
          latest.current.onFocusSearch()
          break
        case 't':
          event.preventDefault()
          latest.current.onToggleLight()
          break
        case '?':
          event.preventDefault()
          latest.current.onToggleHelp()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(chordTimer)
    }
  }, [])
}
