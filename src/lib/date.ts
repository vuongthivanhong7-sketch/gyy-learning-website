import type { Activity } from '../types'

export const TZ = 'Asia/Ho_Chi_Minh'
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Ngày dạng YYYY-MM-DD theo giờ Việt Nam. */
export const vnDay = (d: Date | string = new Date()) => fmt.format(typeof d === 'string' ? new Date(d) : d)

const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}
export const shiftDay = addDays

export function computeStreak(days: Set<string>, today = vnDay()): { current: number; longest: number } {
  if (days.size === 0) return { current: 0, longest: 0 }
  const sorted = [...days].sort()
  let longest = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  // Streak vẫn còn nếu hôm nay hoặc hôm qua có hoạt động.
  let cursor = days.has(today) ? today : addDays(today, -1)
  let current = 0
  while (days.has(cursor)) { current++; cursor = addDays(cursor, -1) }
  return { current, longest }
}

export const activityDays = (a: Activity[]) => new Set(a.map((x) => vnDay(x.ts)))

/** Thứ Hai đầu tuần (giờ VN) của một ngày. */
export function weekStart(day = vnDay()): string {
  const [y, m, d] = day.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = CN
  return addDays(day, -((dow + 6) % 7))
}

export const lastNDays = (n: number, today = vnDay()) =>
  Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)))

export const shortDay = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
