import { CalendarPlus, Monitor, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../../../components/admin/PageHeader'
import { BookingStatusBadge } from '../../../components/booking/StatusBadges'
import SourceBadge from '../../../components/booking/SourceBadge'
import StationStateBadge from '../../../components/stations/StationStateBadge'
import { ButtonLink, Card, DemoTag, EmptyState, ErrorState, Skeleton } from '../../../components/ui'
import { useServiceQuery } from '../../../hooks/useServiceQuery'
import { dashboardService } from '../../../services'
import { formatCurrency, formatDateTimeRange } from '../../../utils/format'
import { useAdmin } from '../../admin/adminContext'

function Kpi({ label, value, hint }) {
  return (
    <Card className="space-y-1">
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular font-display text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  )
}

export default function DashboardPage() {
  const { scope, hub, branches, branchId } = useAdmin()
  const query = useServiceQuery(
    () => dashboardService.getDashboardStats(scope),
    [scope.hubId, scope.branchId],
  )
  const stats = query.data
  const branchName = branches.find((b) => b.id === branchId)?.name ?? 'All branches'

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${hub.name} - ${branchName}. Figures come from the shared demo data.`}
        actions={
          <>
            <DemoTag>Demo data</DemoTag>
            <ButtonLink to="/admin/bookings/new">
              <CalendarPlus aria-hidden="true" className="size-4" />
              New walk-in
            </ButtonLink>
          </>
        }
      />

      {query.error ? (
        <ErrorState message="The dashboard could not be loaded." onRetry={query.refetch} />
      ) : !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Bookings today"
              value={stats.bookingsToday}
              hint="Starting today, any status"
            />
            <Kpi
              label="Active sessions"
              value={stats.activeSessions}
              hint={`${stats.stationsByState.AVAILABLE} of ${stats.stationsTotal} stations free now`}
            />
            <Kpi
              label="Booked value today"
              value={formatCurrency(stats.bookedValueToday)}
              hint="Excludes cancelled bookings"
            />
            <Kpi
              label="Paid today (mock)"
              value={formatCurrency(stats.paidToday)}
              hint={`${formatCurrency(stats.outstandingToday)} not yet marked paid`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Upcoming bookings</h2>
                <Link to="/admin/bookings" className="text-sm text-accent hover:underline">
                  All bookings
                </Link>
              </div>
              {stats.upcoming.length === 0 ? (
                <EmptyState title="Nothing coming up" description="No upcoming bookings." />
              ) : (
                <ul className="divide-y divide-line">
                  {stats.upcoming.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <Link
                          to={`/admin/bookings/${b.id}`}
                          className="font-medium hover:text-accent"
                        >
                          {b.customer.name} - {b.resource.name}
                        </Link>
                        <p className="tabular text-sm text-muted">
                          {formatDateTimeRange(b.startAt, b.endAt)} - {b.reference}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <SourceBadge source={b.source} />
                        <BookingStatusBadge status={b.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-6">
              <Card className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Station availability</h2>
                <ul className="space-y-2 text-sm">
                  {Object.entries(stats.stationsByState).map(([state, n]) => (
                    <li key={state} className="flex items-center justify-between">
                      <StationStateBadge state={state} />
                      <span className="tabular font-medium">{n}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Today by source</h2>
                {Object.keys(stats.todayBySource).length === 0 ? (
                  <p className="text-sm text-muted">No bookings today.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {Object.entries(stats.todayBySource).map(([source, n]) => (
                      <li key={source} className="flex items-center justify-between">
                        <SourceBadge source={source} />
                        <span className="tabular font-medium">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <section aria-label="Quick actions" className="flex flex-wrap gap-3">
            <ButtonLink to="/admin/stations" variant="secondary">
              <Monitor aria-hidden="true" className="size-4" />
              Live stations
            </ButtonLink>
            <ButtonLink to="/admin/sessions" variant="secondary">
              <Timer aria-hidden="true" className="size-4" />
              Sessions
            </ButtonLink>
          </section>
        </div>
      )}
    </div>
  )
}
