import type { Activity, ExerciseRun } from '../types'
import { lastNDays, vnDay } from './date'

export interface Cell { day: string; learned: number; reviews: number; runs: number; xp: number; total: number; level: 0 | 1 | 2 | 3 | 4 }
export interface HeatSummary { daysStudied: number; xp: number; avgLearnedPerActiveDay: number }

export const levelOf = (total: number): Cell['level'] => (total <= 0 ? 0 : total === 1 ? 1 : total <= 3 ? 2 : total <= 6 ? 3 : 4)

/** Heatmap theo ngày (giờ VN). Chỉ ngày có hoạt động thật mới có màu; thưởng nhiệm vụ không được tính là hoạt động học. */
export function buildHeatmap(activity: Activity[], runs: ExerciseRun[], days = 90, today = vnDay()): { cells: Cell[]; summary: HeatSummary } {
  const map = new Map<string, Cell>(lastNDays(days, today).map((d) => [d, { day: d, learned: 0, reviews: 0, runs: 0, xp: 0, total: 0, level: 0 }]))
  for (const a of activity) {
    const c = map.get(vnDay(a.ts)); if (!c) continue
    c.xp += a.points
    if (a.kind === 'learn') c.learned++
    else if (a.kind === 'review') c.reviews++
  }
  for (const r of runs) { const c = map.get(vnDay(r.ts)); if (c) c.runs++ }
  const cells = [...map.values()]
  for (const c of cells) { c.total = c.learned + c.reviews + c.runs; c.level = levelOf(c.total) }
  const active = cells.filter((c) => c.total > 0)
  const learned = cells.reduce((n, c) => n + c.learned, 0)
  return { cells, summary: { daysStudied: active.length, xp: cells.reduce((n, c) => n + c.xp, 0), avgLearnedPerActiveDay: active.length ? Math.round((learned / active.length) * 10) / 10 : 0 } }
}
