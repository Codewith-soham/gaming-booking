// PROTOTYPE ONLY: a localStorage flag that only gates navigation. It is not authentication and
// is not a security control (UX-FLOWS section 6).
const KEY = 'gaming-hub-demo-admin'

export function isAdminLoggedIn() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function loginAdmin() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Without storage the demo guard cannot remember the flag.
  }
}

export function logoutAdmin() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
