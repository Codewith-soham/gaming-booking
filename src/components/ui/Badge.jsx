import { cn } from './cn'

const tones = {
  ok: 'bg-ok/15 text-ok border-ok/40',
  warn: 'bg-warn/15 text-warn border-warn/40',
  danger: 'bg-danger/15 text-danger border-danger/40',
  offline: 'bg-offline/15 text-offline border-offline/40',
  neutral: 'bg-elevated text-muted border-line',
  accent: 'bg-accent/15 text-accent border-accent/40',
}

// Status is always conveyed by text (and an optional icon), never by color alone.
export default function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-3.5" />}
      {children}
    </span>
  )
}
