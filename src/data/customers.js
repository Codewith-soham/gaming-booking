// Fictional people with obviously fake contact details.
const NAMES = [
  'Aarav Mehta',
  'Diya Nair',
  'Kabir Singh',
  'Meera Iyer',
  'Rohan Das',
  'Isha Kulkarni',
  'Vikram Rao',
  'Sana Khan',
]

export function buildCustomers(now) {
  const createdAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  return NAMES.map((name, i) => {
    const n = i + 1
    return {
      id: `cust_${String(n).padStart(3, '0')}`,
      name,
      phone: `+91 90000 0${String(n).padStart(4, '0')}`,
      email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      createdAt,
    }
  })
}
