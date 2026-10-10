import { Globe, MessageCircle, UserRound } from 'lucide-react'
import { Badge } from '../ui'

const SOURCES = {
  WEBSITE: { icon: Globe, label: 'Website' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp' },
  ADMIN: { icon: UserRound, label: 'Walk-in / admin' },
}

// WhatsApp is a booking source value only; the channel itself is not connected in the prototype.
export default function SourceBadge({ source }) {
  const s = SOURCES[source] ?? { label: source }
  return <Badge icon={s.icon}>{s.label}</Badge>
}

export const SOURCE_OPTIONS = Object.entries(SOURCES).map(([value, s]) => ({
  value,
  label: s.label,
}))
