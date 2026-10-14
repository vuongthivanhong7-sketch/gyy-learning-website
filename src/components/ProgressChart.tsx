import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useUserData } from '../store/UserData'
import { lastNDays, shortDay, vnDay } from '../lib/date'
import { useI18n } from '../i18n'

/** Biểu đồ tiến độ: số Quán dụng ngữ đã học và số lượt ôn theo ngày. Chỉ dùng dữ liệu thật. */
export function ProgressChart() {
  const { t: tr, tx: trx } = useI18n()
  const { state } = useUserData()
  const [range, setRange] = useState<7 | 30>(7)
  const { data, learned, reviews, exercises } = useMemo(() => {
    const days = lastNDays(range)
    const m = new Map(days.map((d) => [d, { day: shortDay(d), learned: 0, reviews: 0, exercises: 0 }]))
    for (const a of state.activity) {
      const row = m.get(vnDay(a.ts)); if (!row) continue
      if (a.kind === 'learn') row.learned++
      else if (a.kind === 'review') row.reviews++
    }
    for (const r of state.runs) { const row = m.get(vnDay(r.ts)); if (row) row.exercises++ }
    const data = [...m.values()]
    return { data, learned: data.reduce((n, d) => n + d.learned, 0), reviews: data.reduce((n, d) => n + d.reviews, 0), exercises: data.reduce((n, d) => n + d.exercises, 0) }
  }, [state, range])
  const empty = learned + reviews + exercises === 0
  const tick = { fill: 'rgb(var(--muted))', fontSize: 12 }
  return (
    <section id="thong-ke" className="card flex scroll-mt-24 flex-col gap-3 p-4 sm:p-5" aria-label={tr("Phân tích tiến độ học tập")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">{tr("Phân tích tiến độ học tập")}</h2>
        <div className="flex gap-1.5" role="group" aria-label={tr("Khoảng thời gian")}>
          <button type="button" className={`chip !min-h-[40px] ${range === 7 ? 'chip-on' : ''}`} onClick={() => setRange(7)} aria-pressed={range === 7}>{tr("Tuần (7 ngày)")}</button>
          <button type="button" className={`chip !min-h-[40px] ${range === 30 ? 'chip-on' : ''}`} onClick={() => setRange(30)} aria-pressed={range === 30}>{tr("Tháng (30 ngày)")}</button>
        </div>
      </div>
      <p className="font-semibold">{trx("Trong {0} ngày qua:", [range])}{' '}<b className="text-brand-strong">{learned}</b> {' '}{tr("Quán dụng ngữ đã học ·")}{' '}<b className="text-brand-strong">{reviews}</b> {' '}{tr("lượt ôn ·")}{' '}<b className="text-brand-strong">{exercises}</b> {' '}{tr("bài luyện tập")}</p>
      {empty && <p className="rounded-xl bg-soft p-3 text-sm text-muted">{tr("Chưa có hoạt động nào trong khoảng này. Hoàn thành một bài học để biểu đồ bắt đầu có dữ liệu.")}</p>}
      <div className="h-64 w-full" role="img" aria-label={tr("Biểu đồ cột số Quán dụng ngữ đã học và lượt ôn tập mỗi ngày trong {0} ngày qua", [range])}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
            <XAxis dataKey="day" tick={tick} interval={range === 7 ? 0 : 4} tickLine={false} label={{ value: tr("Ngày"), position: 'insideBottom', offset: -2, fill: 'rgb(var(--muted))', fontSize: 12 }} height={36} />
            <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} label={{ value: tr("Số lượng"), angle: -90, position: 'insideLeft', offset: 22, fill: 'rgb(var(--muted))', fontSize: 12 }} />
            <Tooltip cursor={{ fill: 'rgb(var(--soft))' }} contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--line))', borderRadius: 12, color: 'rgb(var(--ink))' }} />
            <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v: string) => <span style={{ color: 'rgb(var(--ink))' }}>{v}</span>} />
            <Bar dataKey="learned" name={tr("Đã học")} fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="reviews" name={tr("Lượt ôn")} fill="rgb(var(--ok))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="exercises" name={tr("Bài luyện tập")} fill="rgb(var(--warn))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
