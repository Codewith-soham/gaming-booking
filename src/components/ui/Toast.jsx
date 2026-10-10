import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cn } from './cn'

const ToastContext = createContext(null)

const tones = {
  success: 'border-ok/50',
  error: 'border-danger/50',
  info: 'border-line',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (message, tone = 'info') => {
      const id = crypto.randomUUID()
      setToasts((t) => [...t, { id, message, tone }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-lg border bg-elevated px-4 py-3 text-sm shadow-lg',
              tones[t.tone],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
