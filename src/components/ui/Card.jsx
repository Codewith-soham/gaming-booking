import { cn } from './cn'

export default function Card({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={cn('rounded-xl border border-line bg-surface p-5', className)} {...props}>
      {children}
    </Tag>
  )
}
