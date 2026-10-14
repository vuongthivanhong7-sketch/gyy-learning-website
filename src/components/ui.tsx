import { Link } from 'react-router-dom'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Check, Plus, Square, Volume2 } from 'lucide-react'
import { useUserData } from '../store/UserData'
import { speak, canSpeak, currentSpeaking, subscribeSpeaking, currentNotice, clearNotice } from '../lib/speech'
import type { Idiom } from '../types'
import { STATUS_LABEL, isDueProgress, learnStatus } from '../lib/status'
import { useI18n } from '../i18n'

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand font-han font-bold text-on-brand" style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden>
      惯
    </span>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <h3 className="text-lg font-extrabold">{title}</h3>
      {children && <div className="max-w-md text-muted">{children}</div>}
      {action}
    </div>
  )
}

export function DemoBanner() {
  const { t: tr } = useI18n()
  return (
    <div className="rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn" role="note">
      {tr("Đang hiển thị")}{' '}<b>{tr("dữ liệu minh họa")}</b> {' '}{tr("(12 mục do GYY tự soạn để xem thử giao diện). Đây không phải ngữ liệu đề thi HSK 5 và chưa có nguồn sách. Ngữ liệu thật sẽ thay thế khi bạn nạp file Google Sheets.")}</div>
  )
}

/** Nút loa: phát âm một đoạn tiếng Trung (chữ Hán của Quán dụng ngữ hoặc một câu ví dụ). Chỉ phát khi người dùng bấm. */
export function SpeakText({ text, label, audioUrl, className = '', size = 'md' }: { text: string; label: string; audioUrl?: string; className?: string; size?: 'sm' | 'md' }) {
  const { t: tr } = useI18n()
  const key = `${text}`
  const speaking = useSyncExternalStore(subscribeSpeaking, currentSpeaking, () => null) === key
  if (!canSpeak() && !audioUrl) return null
  const dim = size === 'sm' ? 'h-10 w-10' : 'h-11 w-11'
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); void speak(text, { audioUrl, key }) }} aria-pressed={speaking} aria-label={speaking ? tr('Dừng phát') : label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${dim} ${speaking ? 'bg-brand text-on-brand' : 'bg-brand-soft text-brand-strong hover:brightness-95'} ${className}`}>
      {speaking ? <Square size={16} fill="currentColor" /> : <Volume2 size={size === 'sm' ? 18 : 20} />}
    </button>
  )
}

export function SpeakButton({ idiom, className = '' }: { idiom: Idiom; className?: string }) {
  const { t: tr } = useI18n()
  return <SpeakText text={idiom.hanzi} audioUrl={idiom.audio} className={className} label={tr("Nghe phát âm {0}", [idiom.hanzi])} />
}

/** Nút "+" thêm vào Sổ tay. Dùng chung ở mọi thẻ; đổi thành "Đã lưu" và không tạo bản ghi trùng. */
export function AddButton({ idiomId, compact = false }: { idiomId: string; compact?: boolean }) {
  const { t: tr } = useI18n()
  const { isSaved, save } = useUserData()
  const saved = isSaved(idiomId)
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); if (!saved) save(idiomId) }} disabled={false} aria-pressed={saved}
      aria-label={saved ? tr("Đã lưu trong Sổ tay") : tr("Thêm vào Sổ tay của bạn")}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition ${compact ? 'h-11 min-w-[44px] px-3' : 'min-h-[44px] px-4'} ${saved ? 'bg-ok-soft text-ok' : 'bg-brand text-on-brand hover:bg-brand-strong '}`}>
      {saved ? <Check size={18} /> : <Plus size={18} />}
      {!compact && <span>{saved ? tr("Đã lưu") : tr("Lưu vào sổ tay")}</span>}
    </button>
  )
}

export function Illustration({ idiom, className = '' }: { idiom: Idiom; className?: string }) {
  const { t: tr } = useI18n()
  const [broken, setBroken] = useState(false)
  if (idiom.image && !broken) {
    return <img src={idiom.image} alt={tr("Hình minh họa nghĩa bóng của {0}: {1}", [idiom.hanzi, idiom.figurative ?? idiom.meaningVi])} loading="lazy" onError={() => setBroken(true)} className={`w-full rounded-2xl object-cover ${className}`} />
  }
  // Chưa có hình trong dữ liệu: không bịa hình, chỉ hiện ô giữ chỗ rõ ràng.
  return (
    <div className={`flex w-full items-center justify-center rounded-2xl border border-dashed border-line bg-soft px-3 py-6 text-center text-sm text-muted ${className}`}>
      {tr("Chưa có hình minh họa cho mục này")}</div>
  )
}

export function SourceLine({ label, value }: { label: string; value?: string }) {
  const { t: tr } = useI18n()
  return (
    <p className="text-sm text-muted">
      <span className="font-bold">{label}: </span>
      {value ? <span className="han !break-all">{value}</span> : <span>{tr("Chưa có nguồn trong dữ liệu")}</span>}
    </p>
  )
}

export function StatusBadge({ idiomId }: { idiomId: string }) {
  const { t: tr } = useI18n()
  const { progressOf } = useUserData()
  const p = progressOf(idiomId)
  const st = learnStatus(p)
  const tone = st === 'learned' ? 'bg-ok-soft text-ok' : st === 'learning' ? 'bg-brand-soft text-brand-strong' : 'bg-soft text-muted'
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{tr(STATUS_LABEL[st])}</span>
      {isDueProgress(p) && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">{tr("Đến hạn ôn")}</span>}
      {p?.saved && <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-bold text-muted">{tr("Đã lưu")}</span>}
    </span>
  )
}

export function Back({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-brand-strong">‹ {children}</Link>
}

/** Thanh thông báo khi giọng đọc Google không dùng được (hiện trên mọi trang, tự ẩn sau vài giây). */
export function TtsNotice() {
  const { t: tr } = useI18n()
  const msg = useSyncExternalStore(subscribeSpeaking, currentNotice, () => null)
  useEffect(() => { if (!msg) return; const id = setTimeout(clearNotice, 9000); return () => clearTimeout(id) }, [msg])
  if (!msg) return null
  return (
    <div role="status" className="fixed inset-x-3 top-[72px] z-[55] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-warn/40 bg-warn-soft p-3 text-sm font-semibold text-warn shadow-card">
      <span className="min-w-0 flex-1">{tr(msg.replace(' Đang dùng giọng có sẵn trên thiết bị.', ''))}{msg.includes('Đang dùng giọng có sẵn') ? ' ' + tr('Đang dùng giọng có sẵn trên thiết bị.') : ''}</span>
      <button type="button" onClick={clearNotice} aria-label={tr('Đóng')} className="shrink-0 font-extrabold">×</button>
    </div>
  )
}
