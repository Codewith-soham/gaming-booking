import {
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  CreditCard,
  RotateCcw,
  UserX,
  XCircle,
} from 'lucide-react'
import { Badge } from '../ui'

// Booking status and payment status are independent; each has its own badge set.
const BOOKING = {
  PENDING: { tone: 'warn', icon: Clock, label: 'Pending' },
  CONFIRMED: { tone: 'ok', icon: CheckCircle2, label: 'Confirmed' },
  CANCELLED: { tone: 'danger', icon: XCircle, label: 'Cancelled' },
  COMPLETED: { tone: 'neutral', icon: CheckCircle2, label: 'Completed' },
  NO_SHOW: { tone: 'offline', icon: UserX, label: 'No-show' },
}

const PAYMENT = {
  UNPAID: { tone: 'warn', icon: CircleDashed, label: 'Unpaid' },
  PENDING: { tone: 'warn', icon: Clock, label: 'Payment pending' },
  PAID: { tone: 'ok', icon: CreditCard, label: 'Paid' },
  FAILED: { tone: 'danger', icon: Ban, label: 'Payment failed' },
  REFUNDED: { tone: 'neutral', icon: RotateCcw, label: 'Refunded' },
}

export function BookingStatusBadge({ status }) {
  const s = BOOKING[status] ?? { tone: 'neutral', label: status }
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }) {
  const s = PAYMENT[status] ?? { tone: 'neutral', label: status }
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  )
}
