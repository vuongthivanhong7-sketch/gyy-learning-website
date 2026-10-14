import { useUserData } from '../store/UserData'
import { learnStatus } from '../lib/status'
import { useI18n } from '../i18n'

/** Các chỉ số học tập, tính từ lịch sử học thật của người dùng. */
export function StatsGrid() {
  const { t: tr } = useI18n()
  const { state, stats } = useUserData()
  const learning = Object.values(state.progress).filter((p) => learnStatus(p) === 'learning').length
  const cells: [string, string | number, string?][] = [
    [tr("Đã hoàn thành bài học"), stats.learned, tr("đủ 4 bước")],
    [tr("Đang học"), learning, tr("đã làm một phần bài")],
    [tr("Đến hạn ôn tập"), stats.due],
    [tr("Bài tập đã hoàn thành"), stats.runs],
    [tr("Tỉ lệ trả lời đúng"), stats.accuracy === null ? '—' : `${stats.accuracy}%`],
    [tr("Streak hiện tại"), tr("{0} ngày", [stats.streak.current])],
    [tr("Streak dài nhất"), tr("{0} ngày", [stats.streak.longest])],
    [tr("Điểm tuần này"), stats.weekPoints],
  ]
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={tr("Chỉ số học tập")}>
      {cells.map(([l, v, sub]) => (
        <div key={l} className="card p-4">
          <p className="text-sm font-bold text-muted">{l}</p>
          <p className="text-2xl font-extrabold">{v}</p>
          {sub && <p className="text-xs font-semibold text-muted">{sub}</p>}
        </div>
      ))}
    </section>
  )
}
