import type { UserState } from '../types'
import { vnDay } from './date'

export interface Task {
  id: 'review' | 'learn' | 'practice'
  title: string
  /** Khóa dịch (tiếng Việt) và đối số của mô tả. */
  desc: string
  descArgs?: unknown[]
  progress: number
  target: number
  xp: number
  to: string
  /** true = không có việc để làm (ví dụ chưa có mục đến hạn), không tính vào tỉ lệ hoàn thành. */
  idle?: boolean
  done: boolean
  claimed: boolean
}

export const TASK_XP = { review: 10, learn: 10, practice: 5 } as const

/**
 * Nhiệm vụ hôm nay, tính từ hoạt động thật trong ngày (giờ Việt Nam):
 * - Ôn tập: số lượt ôn trong ngày; mục tiêu = min(mục tiêu ôn mỗi ngày, đã ôn + còn đến hạn).
 * - Học mới: số Quán dụng ngữ hoàn thành đủ 4 bước trong ngày.
 * - Luyện tập: số phiên luyện tập trong ngày (mục tiêu 1).
 */
export function computeTasks(state: UserState, dueNow: number, today = vnDay()): Task[] {
  const day = (ts: string) => vnDay(ts) === today
  const reviews = state.activity.filter((a) => a.kind === 'review' && day(a.ts)).length
  const learned = state.activity.filter((a) => a.kind === 'learn' && day(a.ts)).length
  const runs = state.runs.filter((r) => day(r.ts)).length
  const claimed = new Set(state.claims[today] ?? [])
  const { dailyNew, dailyReview } = state.prefs
  const reviewTarget = Math.min(dailyReview, reviews + dueNow)
  const mk = (t: Omit<Task, 'done' | 'claimed'>): Task => ({ ...t, done: !t.idle && t.progress >= t.target, claimed: claimed.has(t.id) })
  return [
    mk({ id: 'review', title: 'Ôn tập đến hạn', desc: reviewTarget === 0 ? 'Chưa có Quán dụng ngữ nào đến hạn ôn tập.' : 'Ôn {0} Quán dụng ngữ theo lịch lặp lại ngắt quãng.', descArgs: [reviewTarget], progress: Math.min(reviews, reviewTarget), target: reviewTarget, xp: TASK_XP.review, to: '/so-tay?ontap=1', idle: reviewTarget === 0 }),
    mk({ id: 'learn', title: 'Học Quán dụng ngữ mới', desc: 'Hoàn thành {0} bài học bốn bước theo mục tiêu của bạn.', descArgs: [dailyNew], progress: Math.min(learned, dailyNew), target: dailyNew, xp: TASK_XP.learn, to: '/hoc' }),
    mk({ id: 'practice', title: 'Một phiên luyện tập', desc: 'Hoàn thành một bài luyện tập bất kỳ.', progress: Math.min(runs, 1), target: 1, xp: TASK_XP.practice, to: '/luyen-tap' }),
  ]
}

export const taskPercent = (tasks: Task[]) => {
  const live = tasks.filter((t) => !t.idle)
  if (live.length === 0) return 0
  return Math.round((live.reduce((n, t) => n + Math.min(1, t.progress / t.target), 0) / live.length) * 100)
}
