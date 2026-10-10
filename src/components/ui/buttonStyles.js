import { cn } from './cn'

const variants = {
  primary: 'bg-accent text-bg hover:bg-accent-hover hover:text-white',
  secondary: 'bg-elevated text-ink border border-line hover:border-accent',
  ghost: 'text-muted hover:text-ink hover:bg-elevated',
  destructive: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
}

export function buttonClasses(variant = 'primary', className) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    className,
  )
}
