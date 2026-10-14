import { useMemo, useState } from 'react'
import { useUserData } from '../store/UserData'
import { buildHeatmap, type Cell } from '../lib/heatmap'
import { computeStreak, activityDays, vnDay } from '../lib/date'
import { useI18n } from '../i18n'

const LEVEL = ['bg-soft border border-line', 'bg-brand/25', 'bg-brand/50', 'bg-brand/75', 'bg-brand']
const fmtDay = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`

/** Lịch sử học tập 90 ngày (giờ Việt Nam). Chỉ hiển thị hoạt động thật. */
export function Heatmap() {
  const { t: tr, tx: trx } = useI18n()
  const { state } = useUserData()
  const { cells, summary } = useMemo(() => buildHeatmap(state.activity, state.runs, 90), [state.activity, state.runs])
  const longest = useMemo(() => computeStreak(activityDays(state.activity.filter((a) => a.kind !== 'bonus'))).longest, [state.activity])
  const [sel, setSel] = useState<string>(vnDay())
  const selected = cells.find((c) => c.day === sel) ?? cells[cells.length - 1]
  // Xếp theo tuần (thứ Hai đầu tuần): thêm ô trống phía trước ngày đầu tiên.
  const first = new Date(`${cells[0].day}T00:00:00Z`).getUTCDay()
  const pad = (first + 6) % 7
  const grid: (Cell | null)[] = [...Array(pad).fill(null), ...cells]
  const empty = summary.daysStudied === 0

  return (
    <section id="lich-su" className="card flex scroll-mt-24 flex-col gap-4 p-4 sm:p-5" aria-labelledby="h-heat">
      <div>
        <h2 id="h-heat" className="text-xl font-extrabold">{tr("Lịch sử học tập")}</h2>
        <p className="text-muted">{tr("Hoạt động học và ôn tập của bạn trong 90 ngày gần nhất.")}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[[tr("Số ngày đã học"), summary.daysStudied], [tr("XP trong 90 ngày"), summary.xp], [tr("Streak dài nhất"), tr("{0} ngày", [longest])], [tr("Học mới trung bình / ngày có học"), summary.avgLearnedPerActiveDay]].map(([l, v]) => (
          <div key={String(l)} className="rounded-2xl bg-soft p-3"><dt className="text-xs font-bold text-muted">{l}</dt><dd className="text-xl font-extrabold">{v}</dd></div>
        ))}
      </dl>
      {empty && <p className="rounded-xl bg-soft p-3 text-sm text-muted">{tr("Chưa có hoạt động nào trong 90 ngày qua. Hoàn thành một bài học hoặc ôn tập để các ô bắt đầu có màu.")}</p>}
      <div className="overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1" role="grid" aria-label={tr("Heatmap hoạt động học theo ngày")}>
          {grid.map((c, i) => c ? (
            <button key={c.day} type="button" role="gridcell" onClick={() => setSel(c.day)} onMouseEnter={() => setSel(c.day)} onFocus={() => setSel(c.day)}
              aria-label={tr("{0}: {1} Quán dụng ngữ đã học, {2} lượt ôn, {3} bài luyện tập", [fmtDay(c.day), c.learned, c.reviews, c.runs])}
              className={`h-4 w-4 rounded-[4px] sm:h-5 sm:w-5 ${LEVEL[c.level]} ${sel === c.day ? 'ring-2 ring-ink/70 ring-offset-1 ring-offset-card' : ''}`} />
          ) : <span key={`p${i}`} className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />)}
        </div>
      </div>
      <p className="min-h-[1.5rem] text-sm font-semibold" aria-live="polite">
        {fmtDay(selected.day)}: {selected.total === 0 ? tr("chưa có hoạt động học") : tr("{0} Quán dụng ngữ đã học, {1} lượt ôn, {2} bài luyện tập, +{3} XP", [selected.learned, selected.reviews, selected.runs, selected.xp])}
      </p>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted" aria-label={tr("Chú giải màu")}>{trx("Ít{0}Nhiều", [LEVEL.map((l, i) => <span key={i} className={`h-3.5 w-3.5 rounded-[3px] ${l}`} />)])}</div>
    </section>
  )
}
