import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from '../context/toastContext'

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside a ToastProvider')
  return context
}
