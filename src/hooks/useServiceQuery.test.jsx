import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bookingInput, setupDomain, teardownDomain } from '../test/helpers'
import { createBooking, listBookings } from '../services/bookingService'
import { useServiceQuery } from './useServiceQuery'

beforeEach(() => setupDomain())
afterEach(() => teardownDomain())

describe('useServiceQuery', () => {
  it('loads data and refreshes when another part of the app changes shared state', async () => {
    const { result } = renderHook(() => useServiceQuery(() => listBookings(), []))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toHaveLength(13))

    await act(async () => {
      await createBooking(bookingInput())
    })
    await waitFor(() => expect(result.current.data).toHaveLength(14))
  })

  it('surfaces service errors', async () => {
    const { result } = renderHook(() =>
      useServiceQuery(() => listBookings().then(() => Promise.reject(new Error('boom'))), []),
    )
    await waitFor(() => expect(result.current.error?.message).toBe('boom'))
    expect(result.current.loading).toBe(false)
  })
})
