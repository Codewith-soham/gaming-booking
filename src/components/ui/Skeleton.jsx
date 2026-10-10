import { cn } from './cn'

export default function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-elevated', className ?? 'h-4 w-full')}
    />
  )
}
