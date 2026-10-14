import { Link } from 'react-router-dom'
import { Check, Flame, Target } from 'lucide-react'
import { useUserData } from '../store/UserData'
import { useUi } from '../store/UiContext'
import { computeTasks, taskPercent } from '../lib/tasks'
import { activityDays, shiftDay, vnDay, weekStart } from '../lib/date'
import { useI18n } from '../i18n'

const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function GoalCard() {
  const { t: tr, tx: trx } = useI18n()
  const { state } = useUserData()
  const { openGoals } = useUi()
  return (
    <section className="card flex flex-col gap-2 !border-2 !border-brand/40 p-4" aria-labelledby="h-goal">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand-strong"><Target size={20} /></span><h2 id="h-goal" className="text-lg font-extrabold">{tr("Mục tiêu học tập")}</h2></div>
      <p className="text-muted">{tr("Thiết lập mục tiêu Quán dụng ngữ mỗi ngày để duy trì thói quen.")}</p>
      <p className="text-sm font-bold">{trx("Hiện tại: {0} mục mới và {1} mục ôn mỗi ngày", [state.prefs.dailyNew, state.prefs.dailyReview])}</p>
      <button type="button" className="btn-soft self-start" onClick={openGoals}>{tr("Chỉnh sửa mục tiêu")}</button>
    </section>
  )
}

export function StreakCard() {
  const { t: tr, tx: trx } = useI18n()
  const { state, stats } = useUserData()
  const days = activityDays(state.activity.filter((a) => a.kind !== 'bonus'))
  const today = vnDay()
  const start = weekStart(today)
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(start, i))
  return (
    <Link to="/hoc/tien-do?muc=lich-su" className="card flex flex-col gap-3 p-4 transition hover:shadow-lg" aria-label={tr("Streak của bạn. Xem lịch sử học")}>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warn-soft text-[#ea580c]"><Flame size={28} fill="currentColor" /></span>
        <div className="min-w-0"><h2 className="text-lg font-extrabold">{tr("Streak của bạn")}</h2><p className="text-2xl font-extrabold text-[#ea580c]">{trx("{0} ngày", [stats.streak.current])}</p></div>
      </div>
      <p className="text-muted">{stats.streak.current > 0 ? tr("Duy trì thói quen học Quán dụng ngữ mỗi ngày!") : tr("Học hoặc ôn tập hôm nay để bắt đầu một streak mới.")}</p>
      <ul className="grid grid-cols-7 gap-1" aria-label={tr("Các ngày trong tuần")}>
        {week.map((d, i) => {
          const on = days.has(d), future = d > today
          return (
            <li key={d} className="flex flex-col items-center gap-1">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${on ? 'bg-[#ea580c] text-white' : future ? 'border border-dashed border-line text-muted/60' : 'border border-line text-muted'} ${d === today ? 'ring-2 ring-brand/60 ring-offset-1 ring-offset-card' : ''}`} aria-label={`${DOW[i]}: ${on ? tr("đã học") : future ? tr("chưa tới") : tr("chưa học")}`}>{on ? <Check size={16} strokeWidth={3} /> : ''}</span>
              <span className="text-[11px] font-bold text-muted">{DOW[i]}</span>
            </li>
          )
        })}
      </ul>
      <p className="text-sm font-bold text-muted">{trx("Kỷ lục: {0} ngày", [stats.streak.longest])}</p>
    </Link>
  )
}

export function TasksCard() {
  const { t: tr, tx: trx } = useI18n()
  const ud = useUserData()
  const tasks = computeTasks(ud.state, ud.stats.due)
  const pct = taskPercent(tasks)
  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="h-tasks">
      <div className="flex items-center justify-between gap-2"><h2 id="h-tasks" className="text-lg font-extrabold">{tr("Nhiệm vụ hôm nay")}</h2><span className="text-sm font-extrabold text-brand-strong">{pct}%</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={tr("Tiến độ nhiệm vụ hôm nay")}><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div>
      <ul className="flex flex-col gap-2.5">
        {tasks.map((t) => (
          <li key={t.id} className="rounded-2xl border border-line p-3">
            <div className="flex items-start justify-between gap-2"><p className="font-extrabold">{tr(t.title)}</p>{!t.idle && <span className="shrink-0 text-sm font-bold text-muted">{t.progress}/{t.target}</span>}</div>
            <p className="text-sm text-muted">{tr(t.desc, t.descArgs)}</p>
            {!t.idle && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-ok" style={{ width: `${Math.min(100, (t.progress / t.target) * 100)}%` }} /></div>}
            <div className="mt-2">
              {t.claimed ? <span className="inline-flex items-center gap-1 text-sm font-extrabold text-ok"><Check size={16} />{trx("Đã nhận +{0} XP", [t.xp])}</span>
                : t.done ? <button type="button" className="btn-primary !min-h-[44px] !px-4 !text-sm" disabled={!ud.canPersist} onClick={() => ud.claimTask(t.id, t.xp)}>{trx("Nhận +{0} XP", [t.xp])}</button>
                : t.idle ? null : <Link to={t.to} className="btn-soft !min-h-[44px] !px-4 !text-sm">{trx("{0} · +{1} XP", [t.id === 'review' ? tr("Bắt đầu ôn") : t.id === 'learn' ? tr("Học ngay") : tr("Luyện tập"), t.xp])}</Link>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
