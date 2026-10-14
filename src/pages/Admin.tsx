import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Pencil, Trash2 } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { useOverrides } from '../store/OverridesContext'
import { useVerify } from '../store/VerifyContext'
import { Page } from '../components/Layout'
import { ImageEditor } from '../components/ImageEditor'
import { ACCESS_LABEL, RESULT_LABEL, VSTATE_LABEL, evaluate, termKey, type ResultStatus, type SourceResult, type VerifyEntry } from '../lib/verify'
import { normalizeOverrides, type Overrides } from '../lib/overrides'
import { idiomTopics, type Idiom } from '../types'
import { TTS_ENDPOINT, cloudSpeak, stopSpeaking } from '../lib/speech'
import { useI18n } from '../i18n'

const download = (name: string, data: unknown) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
const TABS = [['chude', 'Chủ đề'], ['hinh', 'Hình ảnh'], ['kiemchung', 'Kiểm chứng'], ['dexuat', 'Đề xuất'], ['tudien', 'Từ điển'], ['giong', 'Giọng đọc'], ['xuat', 'Xuất / nhập']] as const

export default function Admin() {
  const { t: tr } = useI18n()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'chude'
  const { setAdmin, saveError } = useOverrides()
  useEffect(() => { setAdmin(true) }, [setAdmin])
  return (
    <Page title={tr("Quản trị nội dung Quán dụng ngữ")} subtitle={tr("Quản lý chủ đề, hình minh họa và kết quả kiểm chứng.")}>
      <div className="rounded-2xl border border-warn/40 bg-warn-soft p-4 text-sm font-semibold text-warn" role="note">
        {tr("Mọi chỉnh sửa ở đây được lưu")}{' '}<b>{tr("trên trình duyệt này")}</b> {' '}{tr("(bản nháp), không ai khác nhìn thấy. Muốn áp dụng cho tất cả người học: vào tab “Xuất / nhập”, xuất file, đặt vào")}{' '}<code>{tr("public/data/")}</code> {' '}{tr("rồi triển khai lại. Trang này chưa có tài khoản quản trị thật; việc chặn người dùng thường sửa dữ liệu chung dựa vào cách làm này.")}</div>
      {saveError && <p className="text-sm font-bold text-bad" role="alert">{saveError}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k }, { replace: true })} className={`chip shrink-0 !min-h-[44px] !px-4 !text-base ${tab === k ? 'chip-on' : ''}`}>{tr(l)}</button>)}
      </div>
      {tab === 'chude' && <TopicsAdmin />}
      {tab === 'hinh' && <ImagesAdmin />}
      {tab === 'kiemchung' && <VerifyAdmin />}
      {tab === 'dexuat' && <SuggestionsAdmin />}
      {tab === 'tudien' && <DictAdmin />}
      {tab === 'giong' && <VoiceLab />}
      {tab === 'xuat' && <ExportAdmin />}
    </Page>
  )
}

function useFiltered(idioms: Idiom[], q: string) {
  return useMemo(() => { const t = q.trim(); return t ? idioms.filter((i) => i.hanzi.includes(t) || i.pinyin.toLowerCase().includes(t.toLowerCase()) || i.meaningVi.toLowerCase().includes(t.toLowerCase())) : idioms }, [idioms, q])
}

function TopicsAdmin() {
  const { t: tr, tx: trx } = useI18n()
  const { idioms, topics, overrides } = useIdioms()
  const { update } = useOverrides()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  const list = useFiltered(idioms, q)
  const count = (t: string) => idioms.filter((i) => idiomTopics(i).includes(t)).length

  const addTopic = () => { const n = name.trim(); if (!n) return; update((o) => ({ ...o, topicList: [...new Set([...o.topicList, n])] })); setName('') }
  const setFor = (o: Overrides, i: Idiom, next: string[]): Overrides => ({ ...o, topics: { ...o.topics, [i.id]: [...new Set(next)] } })
  const rename = () => {
    if (!renaming) return
    const { from, to } = { from: renaming.from, to: renaming.to.trim() }
    if (!to || to === from) { setRenaming(null); return }
    update((o) => { let n: Overrides = { ...o, topicList: [...new Set(o.topicList.map((t) => (t === from ? to : t)).concat(to))] }; idioms.filter((i) => idiomTopics(i).includes(from)).forEach((i) => { n = setFor(n, i, idiomTopics(i).map((t) => (t === from ? to : t))) }); return n })
    setRenaming(null)
  }
  const del = (t: string) => {
    if (!confirm(tr("Xóa chủ đề “{0}” khỏi toàn bộ danh sách? Các Quán dụng ngữ không bị xóa.", [t]))) return
    update((o) => { let n: Overrides = { ...o, topicList: o.topicList.filter((x) => x !== t) }; idioms.filter((i) => idiomTopics(i).includes(t)).forEach((i) => { n = setFor(n, i, idiomTopics(i).filter((x) => x !== t)) }); return n })
  }
  const apply = (add: boolean) => {
    if (!target || sel.size === 0) return
    update((o) => { let n = o; idioms.filter((i) => sel.has(i.id)).forEach((i) => { const cur = idiomTopics(i); n = setFor(n, i, add ? [...cur, target] : cur.filter((x) => x !== target)) }); return n })
  }
  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-lg font-extrabold">{trx("Danh mục chủ đề ({0})", [topics.length])}</h2>
        {overrides.topicsNote && <p className="rounded-xl bg-soft p-3 text-sm text-muted">{overrides.topicsNote}</p>}
        <div className="flex flex-col gap-2 sm:flex-row"><input className="input !text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Tên chủ đề mới (ví dụ: Công việc)")} aria-label={tr("Tên chủ đề mới")} onKeyDown={(e) => e.key === 'Enter' && addTopic()} /><button type="button" className="btn-primary sm:shrink-0" onClick={addTopic}>{tr("Thêm chủ đề")}</button></div>
        {topics.length === 0 ? <p className="text-muted">{tr("Chưa có chủ đề nào. GYY không tự gán chủ đề: hãy tạo danh mục rồi gán cho từng mục ở bên dưới.")}</p> : (
          <ul className="flex flex-col gap-2">{topics.map((t) => (
            <li key={t} className="flex flex-wrap items-center gap-2 rounded-xl bg-soft px-3 py-2">
              {renaming?.from === t ? <>
                <input className="input !min-h-[44px] !text-base sm:max-w-xs" value={renaming.to} onChange={(e) => setRenaming({ from: t, to: e.target.value })} aria-label={tr("Tên mới")} />
                <button type="button" className="btn-primary !min-h-[44px] !px-4" onClick={rename}>{tr("Lưu")}</button><button type="button" className="btn-ghost !min-h-[44px] !px-4" onClick={() => setRenaming(null)}>{tr("Hủy")}</button>
              </> : <>
                <b className="min-w-0 flex-1">{tr(t)} <span className="font-semibold text-muted">{trx("({0} mục)", [count(t)])}</span></b>
                <button type="button" className="btn-ghost !min-h-[44px] !px-3" onClick={() => setRenaming({ from: t, to: t })} aria-label={tr("Đổi tên {0}", [tr(t)])}><Pencil size={16} /></button>
                <button type="button" className="btn-ghost !min-h-[44px] !px-3 !text-bad" onClick={() => del(t)} aria-label={tr("Xóa {0}", [tr(t)])}><Trash2 size={16} /></button>
              </>}
            </li>))}</ul>
        )}
      </section>
      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-lg font-extrabold">{tr("Gán chủ đề cho Quán dụng ngữ")}</h2>
        <p className="text-sm text-muted">{tr("Một Quán dụng ngữ có thể thuộc nhiều chủ đề. Chọn các mục rồi thêm hoặc gỡ một chủ đề.")}</p>
        <input className="input !min-h-[48px] !text-base" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Tìm chữ Hán, pinyin, nghĩa…")} aria-label={tr("Tìm mục")} />
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !min-h-[48px] !w-auto max-w-full !text-base" value={target} onChange={(e) => setTarget(e.target.value)} aria-label={tr("Chủ đề cần gán")}><option value="">{tr("Chọn chủ đề…")}</option>{topics.map((t) => <option key={t}>{t}</option>)}</select>
          <button type="button" className="btn-primary !min-h-[44px]" disabled={!target || sel.size === 0} onClick={() => apply(true)}>{trx("Thêm vào {0} mục", [sel.size])}</button>
          <button type="button" className="btn-ghost !min-h-[44px]" disabled={!target || sel.size === 0} onClick={() => apply(false)}>{trx("Gỡ khỏi {0} mục", [sel.size])}</button>
          <button type="button" className="btn-soft !min-h-[44px]" onClick={() => setSel(new Set(list.map((i) => i.id)))}>{trx("Chọn tất cả kết quả ({0})", [list.length])}</button>
          <button type="button" className="btn-ghost !min-h-[44px]" onClick={() => setSel(new Set())}>{tr("Bỏ chọn")}</button>
        </div>
        <ul className="flex max-h-[460px] flex-col gap-1.5 overflow-y-auto pr-1">{list.map((i) => (
          <li key={i.id}><label className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 ${sel.has(i.id) ? 'border-brand bg-brand-soft' : 'border-line'}`}>
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" checked={sel.has(i.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(i.id) ? n.delete(i.id) : n.add(i.id); return n })} />
            <span className="han w-24 shrink-0 text-lg font-bold leading-tight">{i.hanzi}</span>
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">{idiomTopics(i).length ? idiomTopics(i).map((t) => <span key={t} className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-strong">{tr(t)}</span>) : <span className="text-xs text-muted">{tr("Chưa có chủ đề")}</span>}</span>
          </label></li>))}</ul>
      </section>
    </div>
  )
}

function ImagesAdmin() {
  const { t: tr, tx: trx } = useI18n()
  const { idioms } = useIdioms()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const list = useFiltered(idioms, q)
  const withImg = idioms.filter((i) => i.image).length
  return (
    <section className="flex flex-col gap-3">
      <p className="font-semibold text-muted">{trx("{0}/{1} mục có hình. Mục chưa có hình hiển thị ô “Chưa có hình”, GYY không tự tạo hình.", [withImg, idioms.length])}</p>
      <input className="input !min-h-[48px] !text-base" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Tìm chữ Hán, pinyin, nghĩa…")} aria-label={tr("Tìm mục")} />
      <ul className="flex flex-col gap-2">{list.slice(0, 60).map((i) => (
        <li key={i.id} className="card flex flex-col gap-3 p-3">
          <div className="flex items-center gap-3">
            {i.image ? <img src={i.image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-white object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted">{tr("Trống")}</span>}
            <span className="min-w-0 flex-1"><b className="han block text-lg">{i.hanzi}</b><span className="line-clamp-1 text-sm text-muted">{i.imageCredit?.license ?? (i.image ? tr("Chưa ghi giấy phép") : tr("Chưa có hình"))}</span></span>
            <button type="button" className="btn-soft !min-h-[44px] !px-4" onClick={() => setOpen(open === i.id ? null : i.id)}>{open === i.id ? tr("Đóng") : tr("Sửa hình")}</button>
          </div>
          {open === i.id && <ImageEditor idiom={i} onClose={() => setOpen(null)} />}
        </li>))}</ul>
      {list.length > 60 && <p className="text-sm text-muted">{tr("Hiển thị 60 mục đầu. Hãy tìm kiếm để thu hẹp.")}</p>}
    </section>
  )
}

const STATUSES: ResultStatus[] = ['not_checked', 'confirmed', 'found_other_label', 'not_found', 'preliminary']
const blank = (sid: string): SourceResult => ({ sourceId: sid, status: 'not_checked' })

function VerifyAdmin() {
  const { t: tr, tx: trx } = useI18n()
  const ver = useVerify()
  const [params] = useSearchParams()
  const [term, setTerm] = useState(params.get('term') ?? '')
  const [pinyin, setPinyin] = useState('')
  const [literal, setLiteral] = useState('')
  const [approval, setApproval] = useState<NonNullable<VerifyEntry['approval']>>('pending')
  const [note, setNote] = useState('')
  const [results, setResults] = useState<Record<string, SourceResult>>({})
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  const load = (e: VerifyEntry) => {
    setTerm(e.term); setPinyin(e.pinyin ?? ''); setLiteral(e.literal ?? ''); setApproval(e.approval ?? 'pending'); setNote(e.note ?? '')
    setResults(Object.fromEntries(e.results.map((r) => [r.sourceId, r]))); setErr(''); setSaved(false)
  }
  useEffect(() => { const t = params.get('term'); if (t) { const ex = ver.find(t); ex ? load(ex) : (setTerm(t), setResults({})) } }, [params.get('term')]) // eslint-disable-line react-hooks/exhaustive-deps
  const setR = (sid: string, patch: Partial<SourceResult>) => setResults((r) => ({ ...r, [sid]: { ...(r[sid] ?? blank(sid)), ...patch } }))
  const current: VerifyEntry = { term: termKey(term), results: Object.values(results).filter((r) => r.status !== 'not_checked') }
  const ev = evaluate(current)

  const save = () => {
    if (!termKey(term)) return setErr(tr("Nhập cụm từ bằng chữ Hán."))
    for (const r of current.results) {
      const name = ver.sources.find((s) => s.id === r.sourceId)?.short ?? r.sourceId
      const hasEvidence = !!(r.page?.trim() || r.entryNo?.trim() || r.quote?.trim() || r.url?.trim())
      if (r.status === 'confirmed' && !hasEvidence) return setErr(tr("{0}: cần ít nhất một bằng chứng (trang, số mục từ, trích dẫn hoặc đường dẫn) để ghi “xác nhận”.", [name]))
      if (r.status === 'found_other_label' && !(r.labels?.length)) return setErr(tr("{0}: ghi nhãn phân loại thực tế trong tài liệu (ví dụ 成语).", [name]))
      if (r.status === 'preliminary' && !(r.note?.trim() || r.url?.trim())) return setErr(tr("{0}: ghi rõ nguồn của kết quả sơ bộ (đường dẫn hoặc ghi chú).", [name]))
    }
    const today = new Date().toISOString().slice(0, 10)
    const res = current.results.map((r) => ({ ...r, labels: r.status === 'confirmed' ? [...new Set(['惯用语', ...(r.labels ?? [])])] : r.labels, checkedAt: r.checkedAt || today }))
    ver.saveEntry({ term: termKey(term), pinyin: pinyin.trim() || undefined, literal: literal.trim() || undefined, results: res, approval, note: note.trim() || undefined })
    setErr(''); setSaved(true)
  }
  const reset = () => { setTerm(''); setPinyin(''); setLiteral(''); setApproval('pending'); setNote(''); setResults({}); setErr(''); setSaved(false) }

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-lg font-extrabold">{tr("Nhập kết quả kiểm chứng")}</h2>
        <p className="text-sm text-muted">{tr("Chỉ nhập những gì bạn đã đối chiếu trực tiếp trong tài liệu. Không điền số trang, số mục từ hay trích dẫn nếu chưa kiểm tra được.")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input han !min-h-[48px] !text-base" value={term} onChange={(e) => { setTerm(e.target.value); setSaved(false) }} placeholder={tr("Cụm từ (chữ Hán chuẩn)")} aria-label={tr("Cụm từ")} />
          <input className="input !min-h-[48px] !text-base" value={pinyin} onChange={(e) => setPinyin(e.target.value)} placeholder={tr("Pinyin (nếu có)")} aria-label="Pinyin" />
          <input className="input !min-h-[48px] !text-base sm:col-span-2" value={literal} onChange={(e) => setLiteral(e.target.value)} placeholder={tr("Nghĩa đen (nếu xác minh được)")} aria-label={tr("Nghĩa đen")} />
        </div>
        {ver.sources.map((s) => {
          const r = results[s.id] ?? blank(s.id)
          return (
            <fieldset key={s.id} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
              <legend className="han px-1 text-sm font-extrabold">{s.name}</legend>
              <p className="text-xs text-muted">{tr(ACCESS_LABEL[s.access])}</p>
              <select className="input !min-h-[48px] !text-base" value={r.status} onChange={(e) => setR(s.id, { status: e.target.value as ResultStatus })} aria-label={tr("Trạng thái {0}", [s.short])}>{STATUSES.map((st) => <option key={st} value={st}>{tr(RESULT_LABEL[st])}</option>)}</select>
              {r.status !== 'not_checked' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input han !min-h-[48px] !text-base" placeholder={tr("Nhãn phân loại (cách nhau bằng dấu phẩy: 惯用语, 成语)")} value={(r.labels ?? []).join(', ')} onChange={(e) => setR(s.id, { labels: e.target.value.split(/[,，、;；]/).map((x) => x.trim()).filter(Boolean) })} aria-label={tr("Nhãn phân loại")} />
                  <input className="input !min-h-[48px] !text-base" placeholder={tr("Số mục từ")} value={r.entryNo ?? ''} onChange={(e) => setR(s.id, { entryNo: e.target.value })} aria-label={tr("Số mục từ")} />
                  <input className="input !min-h-[48px] !text-base" placeholder="Trang" value={r.page ?? ''} onChange={(e) => setR(s.id, { page: e.target.value })} aria-label="Trang" />
                  <input className="input !min-h-[48px] !text-base" placeholder={tr("Đường dẫn nguồn (nếu có)")} value={r.url ?? ''} onChange={(e) => setR(s.id, { url: e.target.value })} aria-label={tr("Đường dẫn")} />
                  <textarea className="input han !min-h-[70px] !text-base sm:col-span-2" placeholder={tr("Trích dẫn nguyên văn từ tài liệu")} value={r.quote ?? ''} onChange={(e) => setR(s.id, { quote: e.target.value })} aria-label={tr("Trích dẫn")} />
                  <input className="input !min-h-[48px] !text-base" placeholder={tr("Nghĩa / giải thích trong nguồn")} value={r.meaning ?? ''} onChange={(e) => setR(s.id, { meaning: e.target.value })} aria-label="Nghĩa" />
                  <input className="input han !min-h-[48px] !text-base" placeholder={tr("Ví dụ trong nguồn")} value={r.example ?? ''} onChange={(e) => setR(s.id, { example: e.target.value })} aria-label={tr("Ví dụ")} />
                  <input className="input !min-h-[48px] !text-base" placeholder={tr("Người kiểm chứng")} value={r.checker ?? ''} onChange={(e) => setR(s.id, { checker: e.target.value })} aria-label={tr("Người kiểm chứng")} />
                  <input className="input !min-h-[48px] !text-base" type="date" value={r.checkedAt ?? ''} onChange={(e) => setR(s.id, { checkedAt: e.target.value })} aria-label={tr("Ngày kiểm chứng")} />
                  <input className="input !min-h-[48px] !text-base sm:col-span-2" placeholder={tr("Ghi chú")} value={r.note ?? ''} onChange={(e) => setR(s.id, { note: e.target.value })} aria-label={tr("Ghi chú")} />
                </div>
              )}
            </fieldset>
          )
        })}
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="input !min-h-[48px] !text-base" value={approval} onChange={(e) => setApproval(e.target.value as typeof approval)} aria-label={tr("Chấp thuận đưa vào kho")}><option value="pending">{tr("Chấp thuận đưa vào kho GYY: chờ xem xét")}</option><option value="approved">{tr("Đã chấp thuận đưa vào kho GYY")}</option><option value="rejected">{tr("Không đưa vào kho GYY")}</option></select>
          <input className="input !min-h-[48px] !text-base" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Ghi chú của người kiểm chứng")} aria-label={tr("Ghi chú chung")} />
        </div>
        <p className="rounded-xl bg-soft p-3 font-bold">{trx("Kết luận hiện tại: {0}", [VSTATE_LABEL[ev.state]])}</p>
        {err && <p className="text-sm font-bold text-bad" role="alert">{err}</p>}
        {saved && <p className="text-sm font-bold text-ok" role="status">{tr("Đã lưu bản nháp trên máy này. Xuất file ở tab “Xuất / nhập” để áp dụng cho mọi người.")}</p>}
        <div className="flex gap-2"><button type="button" className="btn-primary" onClick={save}>{tr("Lưu kiểm chứng")}</button><button type="button" className="btn-ghost" onClick={reset}>{tr("Làm mới biểu mẫu")}</button></div>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">{trx("Các mục đã có ({0})", [ver.entries.length])}</h2>
        {ver.entries.length === 0 ? <p className="text-muted">{tr("Chưa có hồ sơ kiểm chứng nào. Mọi cụm từ hiện ở trạng thái “Chưa có dữ liệu kiểm chứng”.")}</p> : (
          <ul className="flex flex-col gap-2">{ver.entries.map((e) => {
            const s = evaluate(e).state; const isLocal = ver.localEntries.some((x) => termKey(x.term) === termKey(e.term))
            return <li key={e.term} className="card flex flex-wrap items-center gap-2 p-3"><b className="han text-lg">{e.term}</b><span className="min-w-0 flex-1 text-sm text-muted">{VSTATE_LABEL[s]} · {isLocal ? tr("bản nháp trên máy") : tr("từ file")}</span>
              <button type="button" className="btn-soft !min-h-[44px] !px-3" onClick={() => load(e)}>{tr("Sửa")}</button>
              {isLocal && <button type="button" className="btn-ghost !min-h-[44px] !px-3 !text-bad" onClick={() => confirm(tr("Xóa bản nháp này?")) && ver.deleteEntry(e.term)} aria-label={tr("Xóa {0}", [e.term])}><Trash2 size={16} /></button>}</li>
          })}</ul>
        )}
      </section>
    </div>
  )
}

function SuggestionsAdmin() {
  const { t: tr } = useI18n()
  const ver = useVerify()
  return (
    <section className="flex flex-col gap-3">
      <p className="text-muted">{tr("Các đề xuất tạo trên trình duyệt này. Đề xuất của người học khác chỉ đến được bạn khi họ gửi nội dung đã sao chép, vì bản này chưa có máy chủ nhận đề xuất.")}</p>
      {ver.suggestions.length === 0 ? <p className="text-muted">{tr("Chưa có đề xuất nào.")}</p> : (
        <ul className="flex flex-col gap-2">{ver.suggestions.map((s) => (
          <li key={s.id} className="card flex flex-wrap items-center gap-2 p-3"><b className="han text-lg">{s.term}</b><span className="min-w-0 flex-1 text-sm text-muted">{s.meaning ?? tr("Chưa có nghĩa")} · {VSTATE_LABEL[s.state as keyof typeof VSTATE_LABEL]} · {new Date(s.createdAt).toLocaleDateString('vi-VN')}</span>
            <Link to={`/quan-tri?tab=kiemchung&term=${encodeURIComponent(s.term)}`} className="btn-soft !min-h-[44px] !px-3">{tr("Kiểm chứng")}</Link>
            <button type="button" className="btn-ghost !min-h-[44px] !px-3 !text-bad" onClick={() => ver.deleteSuggestion(s.id)} aria-label={tr("Xóa đề xuất")}><Trash2 size={16} /></button></li>))}</ul>
      )}
    </section>
  )
}

function ExportAdmin() {
  const { t: tr } = useI18n()
  const { local, replace, reset } = useOverrides()
  const ver = useVerify()
  const [msg, setMsg] = useState('')
  const readJson = (f: File | undefined, cb: (j: unknown) => void) => { if (!f) return; f.text().then((t) => { try { cb(JSON.parse(t)); setMsg(tr("Đã nhập dữ liệu.")) } catch { setMsg(tr("File không hợp lệ.")) } }) }
  return (
    <section className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2 p-4">
        <h2 className="text-lg font-extrabold">{tr("Chủ đề và hình ảnh (overrides.json)")}</h2>
        <p className="text-sm text-muted">{tr("Gồm danh mục chủ đề, chủ đề từng mục và hình (kể cả ảnh tải lên, đã nhúng sẵn). Đặt file vào")}{' '}<code>{tr("public/data/overrides.json")}</code> {' '}{tr("rồi triển khai lại để áp dụng cho mọi người.")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => download('overrides.json', local)}><Download size={18} />{tr("Xuất overrides.json")}</button>
          <label className="btn-ghost cursor-pointer">{tr("Nhập overrides.json")}<input type="file" accept="application/json" className="hidden" onChange={(e) => readJson(e.target.files?.[0], (j) => replace(normalizeOverrides(j as Partial<Overrides>)))} /></label>
        </div>
      </div>
      <div className="card flex flex-col gap-2 p-4">
        <h2 className="text-lg font-extrabold">{tr("Kiểm chứng (verifications.json)")}</h2>
        <p className="text-sm text-muted">{tr("Gồm danh sách bốn tài liệu và các hồ sơ kiểm chứng (bản trong file cộng bản nháp trên máy). Đặt vào")}{' '}<code>{tr("public/data/verifications.json")}</code>.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => download('verifications.json', { updatedAt: new Date().toISOString(), sources: ver.sources, entries: ver.entries })}><Download size={18} />{tr("Xuất verifications.json")}</button>
          <label className="btn-ghost cursor-pointer">{tr("Nhập vào bản nháp")}<input type="file" accept="application/json" className="hidden" onChange={(e) => readJson(e.target.files?.[0], (j) => ver.replaceLocal(((j as { entries?: VerifyEntry[] }).entries ?? [])))} /></label>
        </div>
      </div>
      <div className="card flex flex-col gap-2 p-4">
        <h2 className="text-lg font-extrabold">{tr("Xóa bản nháp trên máy này")}</h2>
        <button type="button" className="btn-ghost self-start !text-bad" onClick={() => { if (confirm(tr("Xóa toàn bộ chủ đề và hình đã chỉnh trên máy này? Không thể khôi phục."))) { reset(); setMsg(tr("Đã xóa bản nháp chủ đề và hình.")) } }}>{tr("Xóa chủ đề và hình đã chỉnh")}</button>
      </div>
      {msg && <p className="font-bold text-ok" role="status">{msg}</p>}
    </section>
  )
}

/** Thông tin kỹ thuật về chỉ mục từ điển: chỉ dành cho quản trị viên, không hiện trong phần học. */
function DictAdmin() {
  const { t: tr, tx: trx } = useI18n()
  const ver = useVerify()
  const { idioms } = useIdioms()
  const dup = (() => { const m = new Map<string, number>(); idioms.forEach((i) => m.set(termKey(i.hanzi), (m.get(termKey(i.hanzi)) ?? 0) + 1)); return [...m.entries()].filter(([, n]) => n > 1) })()
  const names: Record<string, string> = { xd: '《现代汉语惯用语词典》', cy: '《常用惯用语辞典》', ys: '《谚语俗语惯用语词典》' }
  return (
    <section className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2 p-4">
        <h2 className="text-lg font-extrabold">{tr("Chỉ mục từ điển (OCR)")}</h2>
        {ver.dictInfo ? (
          <>
            <p className="text-sm text-muted">{trx("Tạo lúc {0}, tổng {1} mục từ.", [new Date(ver.dictInfo.generatedAt).toLocaleString('vi-VN'), ver.dictInfo.entries])}</p>
            <ul className="flex flex-col gap-1.5 text-sm">{Object.entries(ver.dictInfo.pages).map(([k, n]) => <li key={k} className="rounded-xl bg-soft px-3 py-2"><b className="han">{names[k] ?? k}</b>{trx(": đã đọc {0} trang", [n])}</li>)}</ul>
          </>
        ) : <p className="text-muted">{tr("Chưa có chỉ mục từ điển.")}</p>}
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>{tr("Chỉ mục được đọc bằng OCR từ bản quét PDF nên có thể sai chữ hoặc bỏ sót khoảng 10% mục từ. Việc không thấy một mục trong chỉ mục không được dùng để loại hay hạ tư cách mục nào trong 99 Quán dụng ngữ chính thức.")}</li>
          <li>{tr("Hai cuốn đầu là từ điển chuyên về 惯用语; cuốn thứ ba xét theo nhãn 〈惯〉〈谚〉〈俗〉 của từng mục. Mục chưa đọc được nhãn cần xem lại trang gốc.")}</li>
          <li>{tr("Nguồn tham chiếu này tách biệt với nguồn thu thập (sách và đề HSK 5) của 99 mục. Hiệu chỉnh lỗi OCR bằng tab “Kiểm chứng” (bản nhập tay được ưu tiên hơn chỉ mục).")}</li>
          <li>{tr("Cuốn 复旦《惯用语教程》 chưa có tệp, các nguồn trực tuyến chỉ có liên kết tra cứu ngoài và không được tính là đã truy cập.")}</li>
        </ul>
      </div>
      <div className="card flex flex-col gap-2 p-4">
        <h2 className="text-lg font-extrabold">{tr("Kiểm tra trùng lặp trong 99 mục")}</h2>
        <p className="text-sm">{trx("{0} mục; {1}", [idioms.length, dup.length === 0 ? tr("không có chữ Hán nào bị trùng.") : tr("{0} chữ Hán bị trùng: {1}", [dup.length, dup.map(([k]) => k).join(', ')])])}</p>
      </div>
    </section>
  )
}

const CANDIDATES: { gender: 'female' | 'male'; id: string; note: string }[] = [
  { gender: 'female', id: 'cmn-CN-Chirp3-HD-Leda', note: 'Chirp 3 HD, nữ (mặc định)' },
  { gender: 'female', id: 'cmn-CN-Chirp3-HD-Aoede', note: 'Chirp 3 HD, nữ' },
  { gender: 'female', id: 'cmn-CN-Chirp3-HD-Kore', note: 'Chirp 3 HD, nữ' },
  { gender: 'female', id: 'cmn-CN-Chirp3-HD-Zephyr', note: 'Chirp 3 HD, nữ' },
  { gender: 'female', id: 'cmn-CN-Wavenet-A', note: 'WaveNet, nữ' },
  { gender: 'male', id: 'cmn-CN-Chirp3-HD-Charon', note: 'Chirp 3 HD, nam (mặc định)' },
  { gender: 'male', id: 'cmn-CN-Chirp3-HD-Orus', note: 'Chirp 3 HD, nam' },
  { gender: 'male', id: 'cmn-CN-Chirp3-HD-Puck', note: 'Chirp 3 HD, nam' },
  { gender: 'male', id: 'cmn-CN-Chirp3-HD-Algieba', note: 'Chirp 3 HD, nam' },
  { gender: 'male', id: 'cmn-CN-Chirp3-HD-Achird', note: 'Chirp 3 HD, nam' },
  { gender: 'male', id: 'cmn-CN-Wavenet-B', note: 'WaveNet, nam' },
]
const SAMPLE = '他总是在老板面前拍马屁，同事们都看不惯。'

/** Nghe thử cùng một câu bằng nhiều giọng Google để chọn giọng nữ/nam. Cần backend TTS đã cấu hình. */
function VoiceLab() {
  const { t: tr } = useI18n()
  const [text, setText] = useState(SAMPLE)
  const [rate, setRate] = useState(0.9)
  const [msg, setMsg] = useState<Record<string, string>>({})
  const play = async (c: (typeof CANDIDATES)[number]) => {
    stopSpeaking(); setMsg((m) => ({ ...m, [c.id]: '…' }))
    const r = await cloudSpeak(text, c.gender, rate, 'lab-' + c.id, c.id)
    setMsg((m) => ({ ...m, [c.id]: r.ok ? tr('Đã phát bằng {0}', [r.voice ?? c.id]) : tr('Không phát được ({0})', [r.reason ?? 'error']) }))
  }
  return (
    <section className="flex flex-col gap-3">
      <div className="card flex flex-col gap-2 p-4">
        <h2 className="text-lg font-extrabold">{tr('Nghe thử giọng Google TTS')}</h2>
        {!TTS_ENDPOINT && <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">{tr('Chưa cấu hình VITE_TTS_ENDPOINT, nên chưa thể nghe thử giọng Google. Xem HUONG_DAN_NETLIFY.md.')}</p>}
        <p className="text-sm text-muted">{tr('Mọi giọng đọc cùng một câu để so sánh. Chọn giọng ưng ý rồi đặt TTS_VOICE_FEMALE và TTS_VOICE_MALE trong biến môi trường của Netlify (chỉ nhận mã trong danh sách này).')}</p>
        <textarea className="input han !min-h-[72px] !text-base" value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} aria-label={tr('Câu nghe thử')} />
        <label className="flex items-center gap-2 text-sm font-bold">{tr('Tốc độ đọc')}
          <select className="input !min-h-[44px] !w-auto !py-1 !text-base" value={rate} onChange={(e) => setRate(+e.target.value)}><option value={0.7}>{tr('Chậm')}</option><option value={0.9}>{tr('Bình thường')}</option><option value={1.1}>{tr('Nhanh')}</option></select>
        </label>
      </div>
      {(['female', 'male'] as const).map((g) => (
        <div key={g} className="card flex flex-col gap-2 p-4">
          <h3 className="font-extrabold">{g === 'female' ? tr('Giọng nữ') : tr('Giọng nam')}</h3>
          <ul className="flex flex-col gap-2">{CANDIDATES.filter((c) => c.gender === g).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-soft p-2">
              <button type="button" className="btn-primary !min-h-[44px] !px-4" onClick={() => void play(c)} disabled={!TTS_ENDPOINT}>{tr('Nghe')}</button>
              <span className="min-w-0 flex-1"><b className="block break-all text-sm">{c.id}</b><span className="text-xs text-muted">{c.note}</span></span>
              {msg[c.id] && <span className="w-full text-xs text-muted" role="status">{msg[c.id]}</span>}
            </li>))}</ul>
        </div>
      ))}
      <p className="text-xs text-muted">{tr('Giới tính các giọng Chirp 3 HD theo tài liệu Google Cloud Text-to-Speech (docs.cloud.google.com/text-to-speech/docs/chirp3-hd). Chất lượng thực tế phải nghe bằng tai; GYY chưa thể tự đánh giá.')}</p>
    </section>
  )
}
