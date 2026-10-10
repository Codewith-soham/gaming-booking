import { useEffect, useState } from 'react'
import { now } from '../utils/clock'

// Current time that re-renders every `intervalMs` (for live timers).
export function useNow(intervalMs = 1000) {
  const [current, setCurrent] = useState(() => now())
  useEffect(() => {
    const id = setInterval(() => setCurrent(now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return current
}
