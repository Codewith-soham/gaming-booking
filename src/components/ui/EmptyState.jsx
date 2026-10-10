import { Inbox } from 'lucide-react'

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line p-10 text-center">
      <Inbox aria-hidden="true" className="size-8 text-muted" />
      <h3 className="font-medium">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}
