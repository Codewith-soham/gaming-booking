import { now } from '../utils/clock'
import { BookingStatus, PaymentStatus } from '../utils/constants'
import { clone, invalid, requireEntity, requireText } from './helpers'
import { store } from './store'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function digits(phone) {
  return String(phone ?? '').replace(/\D/g, '')
}

function statsFor(state, customerId) {
  const mine = state.bookings.filter((b) => b.customerId === customerId)
  const active = mine.filter((b) => b.status !== BookingStatus.CANCELLED)
  return {
    bookingCount: mine.length,
    // Paid amount for bookings that still stand. Revenue definitions are an open question.
    totalPaid: active
      .filter((b) => b.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, b) => sum + b.totalPrice, 0),
    lastBookingAt:
      mine
        .map((b) => b.startAt)
        .sort()
        .at(-1) ?? null,
  }
}

// filters: { query, hubId } - hubId limits to customers who have booked at that hub.
export async function listCustomers(filters = {}) {
  const state = store.getState()
  const q = filters.query?.trim().toLowerCase()
  const qDigits = digits(filters.query)
  return clone(
    state.customers
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (qDigits && digits(c.phone).includes(qDigits)) ||
          c.email?.toLowerCase().includes(q),
      )
      .filter(
        (c) =>
          !filters.hubId ||
          state.bookings.some((b) => b.customerId === c.id && b.hubId === filters.hubId),
      )
      .map((c) => ({ ...c, stats: statsFor(state, c.id) })),
  )
}

export async function getCustomerById(customerId) {
  const state = store.getState()
  const customer = requireEntity(state.customers, customerId, 'Customer')
  const bookings = state.bookings
    .filter((b) => b.customerId === customerId)
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
  return clone({ ...customer, stats: statsFor(state, customerId), bookings })
}

export async function createCustomer(input) {
  const state = store.getState()
  const name = requireText(input?.name, 'Name')
  const phone = requireText(input?.phone, 'Phone')
  const phoneDigits = digits(phone)
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw invalid('Enter a valid phone number.', { field: 'phone' })
  }
  const email = input.email?.trim() || undefined
  if (email && !EMAIL.test(email)) throw invalid('Enter a valid email address.', { field: 'email' })

  const existing = state.customers.find((c) => digits(c.phone) === phoneDigits)
  if (existing) {
    throw invalid('A customer with this phone number already exists.', {
      field: 'phone',
      customerId: existing.id,
    })
  }

  const customer = {
    id: `cust_${String(store.nextSeq('customer')).padStart(3, '0')}`,
    name,
    phone,
    email,
    createdAt: now().toISOString(),
  }
  store.update((s) => ({ ...s, customers: [...s.customers, customer] }))
  return clone(customer)
}

// The demo has no accounts: one customer is "signed in" for the My bookings page.
export async function getCurrentCustomer() {
  const state = store.getState()
  return clone(requireEntity(state.customers, state.meta.currentCustomerId, 'Customer'))
}

export async function setCurrentCustomer(customerId) {
  requireEntity(store.getState().customers, customerId, 'Customer')
  store.update((s) => ({ ...s, meta: { ...s.meta, currentCustomerId: customerId } }))
  return getCurrentCustomer()
}
