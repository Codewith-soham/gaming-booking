import Badge from './Badge'

export default function DemoTag({ children = 'Demo data' }) {
  return <Badge tone="accent">{children}</Badge>
}
