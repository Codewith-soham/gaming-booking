import { useId } from 'react'
import { cn } from './cn'

const control =
  'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted ' +
  'disabled:opacity-50'

function build(Tag) {
  return function Control({ label, helper, error, className, children, ...props }) {
    const id = useId()
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium" htmlFor={id}>
          {label}
        </label>
        <Tag
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(control, error ? 'border-danger' : 'border-line', className)}
          {...props}
        >
          {children}
        </Tag>
        {helper && !error && <p className="text-xs text-muted">{helper}</p>}
        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    )
  }
}

export const Input = build('input')
export const Select = build('select')
export const Textarea = build('textarea')
