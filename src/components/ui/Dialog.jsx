import { useEffect, useId, useRef } from 'react'
import Button from './Button'

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'

export default function Dialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  children,
}) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    ref.current?.querySelector(FOCUSABLE)?.focus()

    function onKey(e) {
      if (e.key === 'Escape') return onCancel?.()
      if (e.key !== 'Tab') return
      const items = [...ref.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md space-y-4 rounded-xl border border-line bg-elevated p-6"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted">{description}</p>}
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
