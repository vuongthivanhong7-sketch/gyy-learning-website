import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { Page } from '../components/Layout'
import { ProgressChart } from '../components/ProgressChart'
import { StatsGrid } from '../components/StatsGrid'
import { SettingsPanel } from '../components/SettingsPanel'
import { useI18n } from '../i18n'

export default function Me() {
  const { t: tr } = useI18n()
  const { account, backendConfigured, signInWithGoogle, signOut, updateDisplayName } = useAuth()
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  return (
    <Page title={tr("Tôi")}>
      {!backendConfigured && (
        <div className="card flex flex-col gap-2 p-5">
          <h2 className="text-lg font-extrabold">{tr("Dữ liệu học lưu trên máy này")}</h2>
          <p className="text-muted">{tr("Bản này chưa cần đăng nhập. Tiến độ, sổ tay và lịch ôn được lưu trong trình duyệt bạn đang dùng, nên đổi máy hoặc xóa dữ liệu trình duyệt thì sẽ không còn. Đăng nhập Google để đồng bộ giữa các thiết bị sẽ có ở phiên bản sau.")}</p>
          <button type="button" className="btn-ghost self-start !text-bad" onClick={() => { if (confirm(tr("Xóa toàn bộ tiến độ lưu trên thiết bị này?"))) { localStorage.removeItem('gyy:local:v1'); location.reload() } }}>{tr("Xóa tiến độ trên máy này")}</button>
        </div>
      )}
      {backendConfigured && !account && (
        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-extrabold">{tr("Đăng nhập")}</h2>
          <p className="text-muted">{tr("Dùng tài khoản Google của chính bạn. Bạn sẽ được chọn tài khoản trước khi đăng nhập.")}</p>
          {err && <p className="text-sm font-bold text-bad" role="alert">{err}</p>}
          <button type="button" className="btn-primary self-start" onClick={async () => setErr(await signInWithGoogle())}>{tr("Đăng nhập bằng Google")}</button>
        </div>
      )}
      {account && (
        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-extrabold">{tr("Tài khoản")}</h2>
          <p>{tr("Tên hiển thị công khai:")}{' '}<b>{account.displayName}</b></p>
          <p className="text-sm text-muted">{tr("Tên này xuất hiện trên bảng xếp hạng và cộng đồng. Email của bạn không bao giờ được hiển thị.")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="input !text-base" placeholder={tr("Đổi tên hiển thị")} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} aria-label={tr("Tên hiển thị mới")} />
            <button type="button" className="btn-soft" onClick={async () => { const e = await updateDisplayName(name); setErr(e); setMsg(e ? null : tr("Đã đổi tên hiển thị.")); if (!e) setName('') }}>{tr("Lưu tên")}</button>
          </div>
          {msg && <p className="text-sm font-bold text-ok" role="status">{msg}</p>}{err && <p className="text-sm font-bold text-bad" role="alert">{err}</p>}
          <button type="button" className="btn-ghost self-start" onClick={() => void signOut()}>{tr("Đăng xuất")}</button>
        </div>
      )}

      <SettingsPanel />
      <StatsGrid />
      <p className="text-sm text-muted">{tr("Dành cho người quản lý nội dung:")}{' '}<Link to="/quan-tri" className="font-bold text-brand-strong underline">{tr("Quản trị chủ đề, hình ảnh và kiểm chứng")}</Link>.</p>
      <ProgressChart />
    </Page>
  )
}
