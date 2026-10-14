import type { Rating, SrsState } from '../types'

export const RATINGS: { key: Rating; label: string }[] = [
  { key: 'again', label: 'Học lại' },
  { key: 'hard', label: 'Khó' },
  { key: 'good', label: 'Tốt' },
  { key: 'easy', label: 'Dễ' },
]

// Khoảng cách khởi đầu (phút): 1 phút, 6 giờ, 1 ngày, 3 ngày.
const FIRST: Record<Rating, number> = { again: 1, hard: 6 * 60, good: 24 * 60, easy: 3 * 24 * 60 }
const MIN_EASE = 1.3

export const newSrs = (now: Date): SrsState => ({
  ease: 2.5, intervalMin: 0, reps: 0, lapses: 0, dueAt: now.toISOString(),
})

/** Tính lịch ôn tiếp theo. Hàm thuần, có thể kiểm thử. */
export function rate(prev: SrsState | undefined, rating: Rating, now: Date): SrsState {
  const s = prev ?? newSrs(now)
  let { ease, reps, lapses } = s
  let interval: number
  if (rating === 'again') {
    interval = FIRST.again
    lapses += 1
    reps = 0
    ease = Math.max(MIN_EASE, ease - 0.2)
  } else if (reps === 0) {
    interval = FIRST[rating]
    reps = 1
    if (rating === 'hard') ease = Math.max(MIN_EASE, ease - 0.15)
    if (rating === 'easy') ease += 0.15
  } else {
    const base = s.intervalMin
    if (rating === 'hard') {
      interval = Math.max(FIRST.hard, base * 1.2)
      ease = Math.max(MIN_EASE, ease - 0.15)
    } else if (rating === 'good') {
      interval = Math.max(FIRST.good, base * ease)
    } else {
      interval = Math.max(FIRST.easy, base * ease * 1.3)
      ease += 0.15
    }
    reps += 1
  }
  interval = Math.round(interval)
  return {
    ease: Math.round(ease * 100) / 100,
    intervalMin: interval,
    reps,
    lapses,
    lastReviewedAt: now.toISOString(),
    dueAt: new Date(now.getTime() + interval * 60_000).toISOString(),
  }
}

export const previewIntervalMin = (prev: SrsState | undefined, rating: Rating, now = new Date()) =>
  rate(prev, rating, now).intervalMin

type Tr = (key: string, args?: unknown[]) => string
const idTr: Tr = (k, a) => (a ? k.replace(/\{(\d+)\}/g, (_, i) => String(a[Number(i)])) : k)
export function formatInterval(min: number, tr: Tr = idTr): string {
  if (min < 60) return tr('{0} phút', [min])
  if (min < 24 * 60) return tr('{0} giờ', [Math.round(min / 60)])
  const d = Math.round(min / (24 * 60))
  if (d < 30) return tr('{0} ngày', [d])
  return tr('{0} tháng', [Math.round(d / 30)])
}

export const isDue = (s: SrsState | undefined, now = new Date()) => !!s && new Date(s.dueAt).getTime() <= now.getTime()

export function formatDue(iso: string, now = new Date(), tr: Tr = idTr): string {
  const diff = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000)
  if (diff <= 0) return tr('Đến hạn ôn')
  return tr('Ôn lại sau {0}', [formatInterval(diff, tr)])
}
