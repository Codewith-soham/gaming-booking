// All "now" reads go through here so tests (and demos) can freeze time.
let source = () => new Date()

export function now() {
  return source()
}

export function setClock(fn) {
  source = fn
}

export function resetClock() {
  source = () => new Date()
}
