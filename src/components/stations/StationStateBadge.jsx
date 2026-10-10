import { CalendarClock, CheckCircle2, Hammer, PowerOff, Radio } from 'lucide-react'
import { STATION_STATE_HELP, STATION_STATE_LABELS } from '../../utils/stationStatus'
import { Badge } from '../ui'

const STATES = {
  AVAILABLE: { tone: 'ok', icon: CheckCircle2 },
  RESERVED: { tone: 'warn', icon: CalendarClock },
  OCCUPIED: { tone: 'danger', icon: Radio },
  MAINTENANCE: { tone: 'offline', icon: Hammer },
  OFFLINE: { tone: 'neutral', icon: PowerOff },
}

// Always text + icon, never colour alone. The title explains how the state is derived.
export default function StationStateBadge({ state }) {
  const s = STATES[state]
  return (
    <span title={STATION_STATE_HELP[state]}>
      <Badge tone={s.tone} icon={s.icon}>
        {STATION_STATE_LABELS[state]}
      </Badge>
    </span>
  )
}

export function StationLegend() {
  return (
    <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
      {Object.keys(STATES).map((k) => (
        <div key={k} className="space-y-1">
          <dt>
            <StationStateBadge state={k} />
          </dt>
          <dd className="text-muted">{STATION_STATE_HELP[k]}</dd>
        </div>
      ))}
    </dl>
  )
}
