import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { resolveIdiom, useUserData } from '../store/UserData'
import { useAuth } from '../store/AuthContext'
import { IdiomDetail } from '../components/Flashcard'
import { Page } from '../components/Layout'
import { EmptyState } from '../components/ui'
import { VBADGE } from '../lib/verify'
import { RATINGS, formatDue, formatInterval, previewIntervalMin } from '../lib/srs'
import { hanChars, normalizeVi } from '../lib/text'
import { idiomTopics, type CustomIdiom, type Idiom } from '../types'
import { useI18n } from '../i18n'

const EmbeddedShell = ({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h2 className="text-2xl font-extrabold">{title === 'Sổ tay của bạn' ? 'Từ vựng của tôi' : title}</h2>{subtitle && <p className="mt-1 max-w-prose text-muted">{subtitle}</p>}</div>
      {actions}
    </div>
    {children}
  </div>
)

export default function Notebook({ embedded = false }: { embedded?: boolean }) {
  const { t: tr, tx: trx } = useI18n()
  const Shell = embedded ? EmbeddedShell : Page
  const { idioms, topics } = useIdioms()
  const ud = useUserData()
  const { backendConfigured, account, promptLogin } = useAuth()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState('')
  const [filter, setFilter] = useState('')
  const [session, setSession] = useState<string[] | null>(null)
  // Mở từ "Ôn tập SRS": tự bắt đầu phiên ôn với các mục đến hạn (một lần).
  const [params] = useSearchParams()
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current || ud.loading || params.get('ontap') !== '1') return
    autoStarted.current = true
    const ids = ud.dueIds.filter((id) => resolveIdiom(idioms, ud.state.custom, id))
    if (ids.length) setSession(ids)
  }, [ud.loading, ud.dueIds, params]) // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<{ edit?: CustomIdiom } | null>(null)

  const items = useMemo(() => {
    const out: { idiom: Idiom; addedAt: string }[] = []
    for (const p of Object.values(ud.state.progress)) {
      if (!p.saved) continue
      const idiom = resolveIdiom(idioms, ud.state.custom, p.idiomId)
      if (idiom) out.push({ idiom, addedAt: p.savedAt ?? '' })
    }
    return out.filter(({ idiom, addedAt }) => {
      const p = ud.progressOf(idiom.id)
      const due = !!p?.srs && new Date(p.srs.dueAt) <= new Date()
      return (!q || idiom.hanzi.includes(q) || normalizeVi(idiom.meaningVi).includes(normalizeVi(q)) || normalizeVi(idiom.pinyin).includes(normalizeVi(q)))
        && (!topic || idiomTopics(idiom).includes(topic))
        && (!filter || (filter === 'due' ? due : filter === 'learned' ? !!p?.learnedAt : filter === 'new' ? !p?.learnedAt : !!idiom.custom))
        && addedAt !== undefined
    }).sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  }, [ud, idioms, q, topic, filter])

  if (backendConfigured && !account && !ud.loading) {
    return <Shell title={tr("Sổ tay của bạn")}><EmptyState title={tr("Đăng nhập để dùng Sổ tay")} action={<button className="btn-primary" onClick={() => promptLogin(tr("Đăng nhập để xem và lưu Sổ tay của riêng bạn."))}>{tr("Đăng nhập bằng Google")}</button>}>{tr("Sổ tay và lịch ôn tập được lưu riêng cho từng tài khoản Google.")}</EmptyState></Shell>
  }
  if (session) return <Shell title={tr("Ôn tập")} actions={<button className="btn-ghost !min-h-[44px]" onClick={() => setSession(null)}>{tr("Thoát")}</button>}><ReviewSession ids={session} onExit={() => setSession(null)} /></Shell>
  if (form) return <Shell title={form.edit ? tr("Sửa Quán dụng ngữ của bạn") : tr("Thêm Quán dụng ngữ của riêng bạn")}><CustomForm edit={form.edit} topics={topics} onClose={() => setForm(null)} /></Shell>

  const dueNow = ud.dueIds.filter((id) => resolveIdiom(idioms, ud.state.custom, id))
  return (
    <Shell title={tr("Sổ tay của bạn")} subtitle={tr("Quán dụng ngữ bạn lưu từ GYY hoặc tự thêm, ôn theo lịch lặp lại ngắt quãng.")}
      actions={<button type="button" className="btn-primary" onClick={() => setForm({})}><Plus size={20} />{tr("Thêm Quán dụng ngữ của riêng bạn")}</button>}>
      {ud.syncError && <p className="rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad" role="alert">{trx("Lỗi đồng bộ: {0}", [ud.syncError])}</p>}
      {params.get('ontap') === '1' && !ud.loading && ud.dueIds.length === 0 && <p className="rounded-2xl bg-ok-soft p-3 font-bold text-ok" role="status">{tr("Bạn đã ôn xong: hiện chưa có Quán dụng ngữ nào đến hạn ôn tập.")}</p>}
      {!backendConfigured && <p className="rounded-2xl bg-soft p-3 text-sm text-muted">{tr("Sổ tay được lưu ngay trên trình duyệt của bạn (chưa cần đăng nhập). Xóa dữ liệu trình duyệt thì sổ tay cũng mất.")}</p>}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-lg font-extrabold">{trx("Ôn tập hôm nay: {0} mục", [dueNow.length])}</p><p className="text-sm text-muted">{trx("Đã lưu {0} mục (đang hiển thị theo bộ lọc)", [items.length])}</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={dueNow.length === 0} onClick={() => setSession(dueNow)}>{tr("Ôn tập thẻ đến hạn")}</button>
          <Link to="/luyen-tap?pham-vi=pick&chon=saved" className="btn-ghost">{tr("Luyện tập tổng hợp")}</Link>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="input !min-h-[48px] !text-base" placeholder={tr("Tìm trong sổ tay…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={tr("Tìm trong sổ tay")} />
        {topics.length > 0 ? <select className="input !min-h-[48px] !text-base" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={tr("Lọc chủ đề")}><option value="">{tr("Mọi chủ đề")}</option>{topics.map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select> : <span />}
        <select className="input !min-h-[48px] !text-base" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={tr("Lọc trạng thái")}><option value="">{tr("Tất cả")}</option><option value="due">{tr("Đến hạn ôn")}</option><option value="learned">{tr("Đã học 4 bước")}</option><option value="new">{tr("Chưa học")}</option><option value="own">{tr("Tôi tự thêm")}</option></select>
      </div>
      {ud.loading ? <p className="text-muted">{tr("Đang tải sổ tay…")}</p> : items.length === 0 ? (
        <EmptyState title={tr("Sổ tay còn trống")} action={<Link to="/hoc" className="btn-primary">{tr("Đi học Quán dụng ngữ")}</Link>}>{tr("Bấm nút “+” trên bất kỳ thẻ Quán dụng ngữ nào, hoặc tự thêm Quán dụng ngữ bạn gặp ngoài đời.")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">{items.map(({ idiom }) => <NoteRow key={idiom.id} idiom={idiom} onReview={() => setSession([idiom.id])} onEdit={() => setForm({ edit: idiom as CustomIdiom })} />)}</ul>
      )}
    </Shell>
  )
}

function NoteRow({ idiom, onReview, onEdit }: { idiom: Idiom; onReview: () => void; onEdit: () => void }) {
  const { t: tr, tx: trx } = useI18n()
  const ud = useUserData()
  const p = ud.progressOf(idiom.id)
  const [editNote, setEditNote] = useState(false)
  const [note, setNote] = useState(p?.note ?? '')
  const remove = () => {
    if (idiom.custom) { if (confirm(tr("Xóa “{0}” khỏi sổ tay? Mục tự thêm sẽ bị xóa hẳn và không thể khôi phục.", [idiom.hanzi]))) ud.deleteCustom(idiom.id) }
    else if (confirm(tr("Bỏ “{0}” khỏi sổ tay? Tiến độ học vẫn được giữ.", [idiom.hanzi]))) ud.unsave(idiom.id)
  }
  return (
    <li className="card flex flex-col gap-3 p-4">
      <Link to={`/tu/${idiom.id}`} className="flex flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-3"><b className="han text-2xl">{idiom.hanzi}</b><span className="font-semibold text-brand-strong">{idiom.pinyin}</span>
          {idiom.custom && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">{idiom.origin === 'lookup' ? tr("Từ Tra cứu chung") : tr("Do bạn tự thêm")}</span>}
          {idiom.custom && idiom.verification && <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-bold text-muted">{tr(VBADGE[idiom.verification])}</span>}</span>
        <span>{idiom.meaningVi}</span>
      </Link>
      <p className="text-sm text-muted">
        {p?.savedAt && <>{trx("Thêm ngày {0} ·", [new Date(p.savedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })])}{' '}</>}
        {p?.learnedAt ? tr("Đã học 4 bước") : tr("Chưa học 4 bước")} · {p?.srs ? formatDue(p.srs.dueAt, new Date(), tr) : tr("Chưa có lịch ôn")}
        {p?.srs && p.srs.reps > 0 && <> {' '}{trx("· Khoảng cách hiện tại {0}", [formatInterval(p.srs.intervalMin, tr)])}</>}
      </p>
      {editNote ? (
        <div className="flex flex-col gap-2"><textarea className="input !min-h-[88px] !text-base" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={tr("Ghi chú cá nhân…")} />
          <div className="flex gap-2"><button type="button" className="btn-primary !min-h-[44px]" onClick={() => { ud.setNote(idiom.id, note.trim()); setEditNote(false) }}>{tr("Lưu ghi chú")}</button><button type="button" className="btn-ghost !min-h-[44px]" onClick={() => setEditNote(false)}>{tr("Hủy")}</button></div></div>
      ) : p?.note ? <p className="rounded-xl bg-soft p-3 text-sm"><b>{tr("Ghi chú:")}{' '}</b>{p.note}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-soft !min-h-[44px] !px-4" onClick={onReview}><RotateCw size={18} />{tr("Ôn ngay")}</button>
        <button type="button" className="btn-ghost !min-h-[44px] !px-4" onClick={() => setEditNote(true)}><Pencil size={18} />{tr("Ghi chú")}</button>
        {idiom.custom && <button type="button" className="btn-ghost !min-h-[44px] !px-4" onClick={onEdit}><Pencil size={18} />{tr("Sửa")}</button>}
        <button type="button" className="btn-ghost !min-h-[44px] !px-4 !text-bad" onClick={remove}><Trash2 size={18} />{idiom.custom ? tr("Xóa") : tr("Bỏ khỏi sổ tay")}</button>
      </div>
    </li>
  )
}

function ReviewSession({ ids, onExit }: { ids: string[]; onExit: () => void }) {
  const { t: tr, tx: trx } = useI18n()
  const { idioms } = useIdioms()
  const ud = useUserData()
  const [i, setI] = useState(0)
  const [back, setBack] = useState(false)
  const [done, setDone] = useState<Record<string, string>>({})
  const idiom = ids[i] ? resolveIdiom(idioms, ud.state.custom, ids[i]) : undefined
  if (i >= ids.length || !idiom) {
    return <div className="card mx-auto flex max-w-xl flex-col gap-3 p-6 text-center"><p className="text-xl font-extrabold">{tr("Hoàn thành phiên ôn tập")}</p><p className="text-muted">{trx("Bạn đã ôn {0} mục.", [Object.keys(done).length])}</p><button className="btn-primary" onClick={onExit}>{tr("Về sổ tay")}</button></div>
  }
  const p = ud.progressOf(idiom.id)
  const rate = (r: (typeof RATINGS)[number]) => { ud.rateIdiom(idiom.id, r.key, { review: true }); setDone((d) => ({ ...d, [idiom.id]: r.key })); setBack(false); setI(i + 1) }
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <p className="font-bold text-brand-strong">{trx("Mục {0}/{1}", [i + 1, ids.length])}</p>
      <div className="card p-4 sm:p-6">
        {!back ? (
          <button type="button" className="flex min-h-[260px] w-full flex-col items-center justify-center gap-5" onClick={() => setBack(true)}>
            <span className="han text-[clamp(2.75rem,14vw,5rem)] font-bold leading-tight">{idiom.hanzi}</span>
            <span className="rounded-full bg-brand-soft px-4 py-2 font-bold text-brand-strong">{tr("Chạm để xem đáp án")}</span>
          </button>
        ) : <IdiomDetail idiom={idiom} showAdd={false} headerSize="text-4xl" />}
      </div>
      {back && (
        <div>
          <p className="mb-2 font-extrabold">{tr("Bạn nhớ đến mức nào?")}</p>
          <div className="grid grid-cols-2 gap-2">
            {RATINGS.map((r) => (
              <button key={r.key} type="button" onClick={() => rate(r)} className="flex min-h-[64px] flex-col items-center justify-center rounded-2xl border-2 border-line bg-card font-extrabold hover:bg-soft">
                {tr(r.label)}<span className="text-xs font-semibold text-muted">{trx("Ôn lại sau {0}", [formatInterval(previewIntervalMin(p?.srs, r.key), tr)])}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CustomForm({ edit, topics, onClose }: { edit?: CustomIdiom; topics: string[]; onClose: () => void }) {
  const { t: tr } = useI18n()
  const ud = useUserData()
  const [v, setV] = useState({
    hanzi: edit?.hanzi ?? '', pinyin: edit?.pinyin ?? '', meaningVi: edit?.meaningVi ?? '', literal: edit?.literal ?? '', figurative: edit?.figurative ?? '',
    exZh: edit?.examples[0]?.zh ?? '', exPy: edit?.examples[0]?.pinyin ?? '', exVi: edit?.examples[0]?.vi ?? '', topic: edit?.topic ?? '', note: edit?.note ?? '', image: edit?.image ?? '',
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const f = (k: keyof typeof v) => ({ value: v[k], onChange: (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value })) })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (hanChars(v.hanzi).length < 2) er.hanzi = tr("Nhập Quán dụng ngữ bằng chữ Hán (ít nhất 2 chữ).")
    if (v.meaningVi.trim().length < 2) er.meaningVi = tr("Nhập nghĩa tiếng Việt.")
    if (v.image && !/^https?:\/\//i.test(v.image)) er.image = tr("Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://")
    setErr(er)
    if (Object.keys(er).length) return
    const example = v.exZh.trim() ? { zh: v.exZh.trim(), pinyin: v.exPy.trim() || undefined, vi: v.exVi.trim() || undefined } : undefined
    const base = {
      hanzi: v.hanzi.trim(), pinyin: v.pinyin.trim(), meaningVi: v.meaningVi.trim(), literal: v.literal.trim() || undefined, figurative: v.figurative.trim() || undefined,
      topic: v.topic.trim() || undefined, note: v.note.trim() || undefined, image: v.image.trim() || undefined,
    }
    if (edit) ud.updateCustom({ ...edit, ...base, examples: example ? [example] : [] })
    else if (!ud.addCustom({ ...base, example })) return
    onClose()
  }
  const Field = ({ k, label, req, area, hint }: { k: keyof typeof v; label: string; req?: boolean; area?: boolean; hint?: string }) => (
    <label key={k} className="flex flex-col gap-1.5"><span className="font-bold">{label}{req && <span className="text-bad"> *</span>}</span>
      {area ? <textarea className="input !min-h-[80px] !text-base" {...f(k)} maxLength={500} /> : <input className={`input !text-base ${k === 'hanzi' || k === 'exZh' ? 'han' : ''}`} {...f(k)} maxLength={300} list={k === 'topic' ? 'topics-list' : undefined} />}
      {hint && <span className="text-sm text-muted">{hint}</span>}{err[k] && <span className="text-sm font-bold text-bad" role="alert">{err[k]}</span>}</label>
  )
  return (
    <form onSubmit={submit} className="card mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6" noValidate>
      <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">{tr("Mục này sẽ được đánh dấu là “Do bạn tự thêm”, không gắn với sách HSK 5 nào.")}</p>
      {Field({ k: 'hanzi', label: tr("Quán dụng ngữ (chữ Hán)"), req: true })}{Field({ k: 'pinyin', label: 'Pinyin' })}{Field({ k: 'meaningVi', label: tr("Nghĩa tiếng Việt"), req: true })}
      {Field({ k: 'literal', label: tr("Nghĩa đen") })}{Field({ k: 'figurative', label: tr("Nghĩa bóng") })}
      {Field({ k: 'exZh', label: tr("Câu ví dụ (tiếng Trung)"), area: true })}{Field({ k: 'exPy', label: tr("Pinyin của câu ví dụ") })}{Field({ k: 'exVi', label: tr("Bản dịch câu ví dụ") })}
      {Field({ k: 'topic', label: tr("Chủ đề") })}<datalist id="topics-list">{topics.map((t) => <option key={t} value={t} />)}</datalist>
      {Field({ k: 'note', label: tr("Nguồn ghi chú"), hint: tr("Ví dụ: tên phim, sách, hoặc cuộc hội thoại bạn gặp cụm này.") })}
      {Field({ k: 'image', label: tr("Đường dẫn ảnh (nếu có)") })}
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" className="btn-ghost" onClick={onClose}>{tr("Hủy")}</button><button type="submit" className="btn-primary">{edit ? tr("Lưu thay đổi") : tr("Thêm vào sổ tay")}</button></div>
    </form>
  )
}
