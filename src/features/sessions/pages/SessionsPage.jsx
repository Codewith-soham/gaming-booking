import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../../components/admin/PageHeader'
import {
  Badge,
  Button,
  Card,
  DemoTag,
  Dialog,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  Tabs,
  useToast,
} from '../../../components/ui'
import { useNow } from '../../../hooks/useNow'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { sessionService } from '../../../services'
import { BOOKING_RULES } from '../../../utils/constants'
import { isServiceError } from '../../../utils/errors'
import { formatDateTimeRange, formatTime, typeLabel } from '../../../utils/format'
import { plusMinutes, toMs } from '../../../utils/time'
import { useAdmin } from '../../admin/adminContext'

const TABS = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'NOT_STARTED', label: 'Upcoming' },
  { id: 'COMPLETED', label: 'Completed' },
]
const EMPTY = {
  ACTIVE: 'No sessions are running right now.',
  NOT_STARTED: 'No upcoming sessions to start.',
  COMPLETED: 'No completed sessions yet.',
}
const EXTEND_OPTIONS = [30, 60, 90, 120]
const ENDING_SOON_MS = 10 * 60000

function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export default function SessionsPage() {
  const { scope } = useAdmin()
  const toast = useToast()
  const now = useNow(1000)
  const [tab, setTab] = useState('ACTIVE')
  const [dialog, setDialog] = useState(null) // { kind: 'extend' | 'complete', session }
  const [minutes, setMinutes] = useState(30)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const query = useServiceQuery(
    () => sessionService.listSessions({ ...scope, status: tab }),
    [scope.hubId, scope.branchId, tab],
  )
  const sessions = query.data

  function close() {
    setDialog(null)
    setError(null)
  }

  async function start(session) {
    try {
      await sessionService.startSession(session.bookingId)
      toast.success(`Session started on ${session.resource.name}.`)
    } catch (err) {
      toast.error(isServiceError(err) ? err.message : 'The session could not be started.')
    }
  }

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      if (dialog.kind === 'extend') {
        await sessionService.extendSession(dialog.session.bookingId, minutes)
        toast.success(`Extended by ${minutes} minutes.`)
      } else {
        await sessionService.completeSession(dialog.session.bookingId)
        toast.success('Session completed.')
      }
      close()
    } catch (err) {
      // The validation result stays visible in the dialog (e.g. the clashing booking).
      setError(isServiceError(err) ? err.message : 'That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Start a session from a confirmed booking, extend it when the station is free, and complete it when the customer leaves."
        actions={<DemoTag>Simulated timers</DemoTag>}
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Session status" />

      <div className="mt-4">
        {query.error ? (
          <ErrorState message="Sessions could not be loaded." onRetry={query.refetch} />
        ) : !sessions ? (
          <Skeleton className="h-40 w-full" />
        ) : sessions.length === 0 ? (
          <EmptyState title={EMPTY[tab]} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {sessions.map((s) => {
              const remaining = toMs(s.expectedEndAt) - toMs(now)
              const opensAt = plusMinutes(s.booking.startAt, -BOOKING_RULES.START_EARLY_MINUTES)
              const tooEarly = toMs(now) < toMs(opensAt)
              return (
                <li key={s.bookingId}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {s.resource.name}{' '}
                          <span className="text-sm font-normal text-muted">
                            {typeLabel(s.resource.type)}
                          </span>
                        </p>
                        <p className="text-sm text-muted">{s.customer.name}</p>
                      </div>
                      {tab === 'ACTIVE' && remaining <= 0 && (
                        <Badge tone="danger">Time is up</Badge>
                      )}
                      {tab === 'ACTIVE' && remaining > 0 && remaining <= ENDING_SOON_MS && (
                        <Badge tone="warn">Ending soon</Badge>
                      )}
                      {s.extensionCount > 0 && <Badge>Extended x{s.extensionCount}</Badge>}
                    </div>

                    <p className="tabular text-sm text-muted">
                      {formatDateTimeRange(s.booking.startAt, s.expectedEndAt)}
                      <br />
                      <Link
                        to={`/admin/bookings/${s.booking.id}`}
                        className="text-accent hover:underline"
                      >
                        {s.booking.reference}
                      </Link>
                    </p>

                    {tab === 'ACTIVE' && (
                      <>
                        <dl className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-xs text-muted">Elapsed</dt>
                            <dd className="tabular font-display text-2xl font-bold">
                              {clock(toMs(now) - toMs(s.startedAt))}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">
                              {remaining >= 0 ? 'Remaining' : 'Over by'}
                            </dt>
                            <dd className="tabular font-display text-2xl font-bold">
                              {clock(Math.abs(remaining))}
                            </dd>
                          </div>
                        </dl>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => setDialog({ kind: 'extend', session: s })}
                          >
                            Extend
                          </Button>
                          <Button onClick={() => setDialog({ kind: 'complete', session: s })}>
                            Complete
                          </Button>
                        </div>
                      </>
                    )}

                    {tab === 'NOT_STARTED' && (
                      <div className="space-y-2">
                        <Button disabled={tooEarly} onClick={() => start(s)}>
                          Start session
                        </Button>
                        {tooEarly && (
                          <p className="text-xs text-muted">
                            Can start from {formatTime(opensAt)}.
                          </p>
                        )}
                      </div>
                    )}

                    {tab === 'COMPLETED' && (
                      <p className="tabular text-sm text-muted">
                        Played {formatTime(s.startedAt)} - {formatTime(s.actualEndAt)}
                      </p>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={dialog?.kind === 'extend'}
        title="Extend session"
        description={
          dialog
            ? `${dialog.session.resource.name} - ${dialog.session.customer.name}. The station is checked for clashing bookings first.`
            : ''
        }
        confirmLabel={busy ? 'Checking...' : 'Extend'}
        onConfirm={confirm}
        onCancel={close}
      >
        <Select
          label="Extend by"
          value={minutes}
          onChange={(e) => {
            setMinutes(Number(e.target.value))
            setError(null)
          }}
        >
          {EXTEND_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </Select>
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
            {error}
          </p>
        )}
      </Dialog>

      <Dialog
        open={dialog?.kind === 'complete'}
        title="Complete this session?"
        description={
          dialog
            ? `${dialog.session.resource.name} - ${dialog.session.customer.name}. The booking will be marked completed. Payment status is not changed.`
            : ''
        }
        confirmLabel={busy ? 'Working...' : 'Complete session'}
        onConfirm={confirm}
        onCancel={close}
      >
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
            {error}
          </p>
        )}
      </Dialog>
    </div>
  )
}
