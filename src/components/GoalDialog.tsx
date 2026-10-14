import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useUi } from '../store/UiContext'
import { useUserData } from '../store/UserData'
import { useI18n } from '../i18n'

function Stepper({ label, value, min, max, onChange, unit }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; unit: string }) {
  const { t: tr } = useI18n()
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3">
      <div className="min-w-0"><p className="font-bold">{label}</p><p className="text-sm text-muted">{unit}</p></div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost !min-h-[44px] !min-w-[44px] !px-0" onClick={() => onChange(Math.max(min, value - 1))} aria-label={tr("Giảm {0}", [label])}><Minus size={18} /></button>
        <span className="w-10 text-center text-xl font-extrabold" aria-live="polite">{value}</span>
        <button type="button" className="btn-ghost !min-h-[44px] !min-w-[44px] !px-0" onClick={() => onChange(Math.min(max, value + 1))} aria-label={tr("Tăng {0}", [label])}><Plus size={18} /></button>
      </div>
    </div>
  )
}

/** Cài đặt mục tiêu học và thông báo. Lưu theo tài khoản (hoặc trên máy này khi chưa có đăng nhập). */
export function GoalDialog() {
  const { t: tr } = useI18n()
  const { goalsOpen, closeGoals } = useUi()
  const { state, setPrefs, canPersist } = useUserData()
  const [p, setP] = useState(state.prefs)
  useEffect(() => { if (goalsOpen) setP(state.prefs) }, [goalsOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!goalsOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeGoals()
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey)
  }, [goalsOpen, closeGoals])
  if (!goalsOpen) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={tr("Mục tiêu học tập")}>
      <button type="button" aria-label={tr("Đóng")} className="absolute inset-0 bg-black/50" onClick={closeGoals} />
      <div className="card relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-xl2" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <h2 className="text-xl font-extrabold">{tr("Mục tiêu học tập")}</h2>
        <p className="mt-1 text-muted">{tr("Thiết lập mục tiêu Quán dụng ngữ mỗi ngày để duy trì thói quen. Mục tiêu chỉ dùng để theo dõi nhiệm vụ, không tự cộng thành tích.")}</p>
        <div className="mt-4 flex flex-col gap-3">
          <Stepper label={tr("Học mới mỗi ngày")} value={p.dailyNew} min={1} max={30} unit={tr("Quán dụng ngữ (hoàn thành đủ 4 bước)")} onChange={(n) => setP({ ...p, dailyNew: n })} />
          <Stepper label={tr("Ôn tập mỗi ngày")} value={p.dailyReview} min={1} max={50} unit={tr("Quán dụng ngữ đến hạn")} onChange={(n) => setP({ ...p, dailyReview: n })} />
          <fieldset className="rounded-2xl border border-line p-3">
            <legend className="px-1 text-sm font-bold text-muted">{tr("Thông báo")}</legend>
            <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--brand))]" checked={p.notifyDue} onChange={(e) => setP({ ...p, notifyDue: e.target.checked })} />{tr("Nhắc khi có Quán dụng ngữ đến hạn ôn")}</label>
            <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--brand))]" checked={p.notifyDaily} onChange={(e) => setP({ ...p, notifyDaily: e.target.checked })} />{tr("Nhắc học khi hôm nay chưa có hoạt động")}</label>
          </fieldset>
        </div>
        {!canPersist && <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">{tr("Bạn cần đăng nhập để lưu mục tiêu.")}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost" onClick={closeGoals}>{tr("Hủy")}</button>
          <button type="button" className="btn-primary" disabled={!canPersist} onClick={() => { setPrefs(p); closeGoals() }}>{tr("Lưu mục tiêu")}</button>
        </div>
      </div>
    </div>
  )
}
