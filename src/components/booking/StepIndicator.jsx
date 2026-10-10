import { Check } from 'lucide-react'
import { cn } from '../ui'

// Earlier steps are clickable so customers can go back without losing their choices.
export default function StepIndicator({ steps, current, onSelect }) {
  return (
    <ol aria-label="Booking steps" className="flex flex-wrap gap-2">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} aria-current={active ? 'step' : undefined}>
            <button
              type="button"
              disabled={!done}
              onClick={() => onSelect(i)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
                active && 'border-accent bg-accent/15 text-ink',
                done && 'border-line text-ink hover:border-accent',
                !done && !active && 'border-line text-muted',
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-5 items-center justify-center rounded-full bg-elevated text-xs"
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
