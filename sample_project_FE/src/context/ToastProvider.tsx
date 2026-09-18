import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastViewport } from '../components/common/ToastViewport'
import { ToastContext, type Toast, type ToastVariant } from './toastContext'

const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, variant }])
      window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast])

  return (
    <ToastContext value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext>
  )
}
