import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Copy, ExternalLink, Search } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { useVerify } from '../store/VerifyContext'
import { useUserData } from '../store/UserData'
import { IdiomDetail } from '../components/Flashcard'
import { ReferenceSources } from '../components/ReferenceSources'
import { EmptyState } from '../components/ui'
import { evaluate, termKey } from '../lib/verify'
import { isHan } from '../lib/text'
import { matchIdiom } from '../lib/search'
import { useI18n } from '../i18n'
import { lookupExt, suggestExt, pinyinMarks, splitSenses, type ExtEntry, type ExtMeta } from '../lib/extdict'
import { classify } from '../lib/classify'

const EXTERNAL = (key: string) => [
  { name: '汉典', url: `https://www.zdic.net/search/?q=${encodeURIComponent(key)}` },
  { name: '百度汉语', url: `https://hanyu.baidu.com/s?wd=${encodeURIComponent(key)}` },
  { name: '汉语大词典', url: 'https://app.hanyudacidian.cn/' },
  { name: 'CCL 语料库', url: 'https://corpus.pku.edu.cn/' },
]

export default function LookupGeneral() {
  const { t: tr } = useI18n()
  const { idioms } = useIdioms()
  const ver = useVerify()
  const ud = useUserData()
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('')
  const [err, setErr] = useState('')
  const [autoPy, setAutoPy] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const [meaning, setMeaning] = useState('')
  const [note, setNote] = useState('')

  const isChinese = Array.from(term).some(isHan)
  const key = isChinese ? termKey(term) : ''
  const khoExact = key ? idioms.find((i) => termKey(i.hanzi) === key) : undefined
  // Từ khóa không phải chữ Hán: tìm trong kho GYY theo pinyin / nghĩa tiếng Việt / tiếng Anh.
  const khoSearch = useMemo(() => (!isChinese && term.trim() ? idioms.filter((i) => matchIdiom(i, term)).slice(0, 20) : []), [idioms, term, isChinese])
  const khoRelated = key.length >= 2 ? idioms.filter((i) => i.id !== khoExact?.id && (termKey(i.hanzi).includes(key) || key.includes(termKey(i.hanzi)))).slice(0, 6) : []
  const entry = key ? ver.lookup(key) : undefined
  const ev = evaluate(entry)
  const hasRef = !!entry?.results.some((r) => r.status === 'confirmed' || r.status === 'found_other_label' || r.status === 'preliminary')
  const evidence = entry?.results.find((r) => r.meaning || r.example)
  // Từ điển mở rộng (CC-CEDICT): tra chữ Hán ngoài 99 mục GYY.
  const [ext, setExt] = useState<{ status: 'idle' | 'loading' | 'ok' | 'unavailable'; entries: ExtEntry[] }>({ status: 'idle', entries: [] })
  const [meta, setMeta] = useState<ExtMeta | null>(null)
  const [sugg, setSugg] = useState<ExtEntry[]>([])
  useEffect(() => {
    if (!key) { setExt({ status: 'idle', entries: [] }); return }
    let off = false
    setExt({ status: 'loading', entries: [] })
    lookupExt(key).then((r) => { if (!off) setExt(r) })
    return () => { off = true }
  }, [key])
  useEffect(() => {
    if (typeof __SINGLE__ !== 'undefined' && __SINGLE__) { void import('../data/dictInline').then((m) => setMeta(m.meta as ExtMeta)); return }
    fetch(`${import.meta.env.BASE_URL}data/dict/_meta.json`).then((r) => (r.ok ? r.json() : null)).then((m) => setMeta(m as ExtMeta | null)).catch(() => {})
  }, [])
  useEffect(() => {
    const t = input.trim()
    if (!t || !Array.from(t).some(isHan) || t === term) { setSugg([]); return }
    let off = false
    const id = setTimeout(() => { void suggestExt(termKey(t)).then((r) => { if (!off) setSugg(r) }) }, 180)
    return () => { off = true; clearTimeout(id) }
  }, [input, term])
  const cls = classify(ev, ext.entries)
  const extPinyin = ext.entries[0] ? pinyinMarks(ext.entries[0].p) : ''
  const alreadySaved = ud.state.custom.some((c) => c.origin === 'lookup' && termKey(c.hanzi) === key)

  useEffect(() => {
    setAutoPy('')
    if (!key) return
    let off = false
    import('pinyin-pro').then(({ pinyin }) => { if (!off) setAutoPy(pinyin(key, { toneType: 'symbol', type: 'string' })) }).catch(() => {})
    return () => { off = true }
  }, [key])
  useEffect(() => { setMeaning(khoExact?.meaningVi ?? evidence?.meaning ?? ''); setNote(''); setSaveOpen(false) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent, override?: string) => {
    e.preventDefault()
    const t = (override ?? input).trim()
    if (!t) { setErr(tr('Hãy nhập từ khóa.')); return }
    setErr(''); setInput(t); setTerm(t)
    if (Array.from(t).some(isHan)) ver.addHistory({ term: termKey(t), state: evaluate(ver.lookup(termKey(t))).state })
  }
  const saveCustom = () => {
    if (meaning.trim().length < 2) return
    const ok = ud.addCustom({ hanzi: key, pinyin: autoPy, meaningVi: meaning.trim(), literal: entry?.literal, note: tr('Lưu từ Tra cứu chung'), origin: 'lookup', verification: ev.state, personalNote: note.trim() || undefined, example: evidence?.example ? { zh: evidence.example } : undefined })
    if (ok) setSaveOpen(false)
  }
  const suggest = () => ver.addSuggestion({ term: key, meaning: meaning.trim() || undefined, note: note.trim() || undefined, state: ev.state })
  const [suggested, setSuggested] = useState(false)
  useEffect(() => setSuggested(false), [key])

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={(e) => submit(e)} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={22} />
          <input className="input han !pl-12" value={input} onChange={(e) => setInput(e.target.value)} placeholder={tr('Nhập từ hoặc cụm từ tiếng Trung, ví dụ: 打交道')} aria-label={tr('Từ hoặc cụm từ cần tra')} lang="zh-CN" autoCapitalize="none" spellCheck={false} />
        </div>
        <button type="submit" className="btn-primary sm:shrink-0">{tr('Kiểm tra')}</button>
      </form>
      {sugg.length > 0 && (
        <ul className="-mt-3 flex flex-wrap gap-2" aria-label={tr('Gợi ý')}>
          {sugg.map((s) => <li key={s.s + s.p}><button type="button" className="chip han !min-h-[44px] !px-4 !text-base" onClick={(e) => submit(e as unknown as FormEvent, s.s)}>{s.s}<span className="text-xs text-muted">{pinyinMarks(s.p)}</span></button></li>)}
        </ul>
      )}
      {err && <p className="text-sm font-bold text-bad" role="alert">{err}</p>}

      {term.trim() && (
        <section className="flex flex-col gap-4" aria-live="polite">
          {/* Từ khóa không phải chữ Hán: kết quả trong kho GYY */}
          {!isChinese && (khoSearch.length > 0 ? (
            <ul className="flex flex-col gap-2">{khoSearch.map((i) => (
              <li key={i.id}><Link to={`/tu/${i.id}`} className="card flex items-baseline gap-3 p-3"><b className="han text-xl">{i.hanzi}</b><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-brand-strong">{i.pinyin}</span><span className="line-clamp-2 text-sm">{i.meaningVi}</span></span></Link></li>
            ))}</ul>
          ) : <NotFound term={term} tr={tr} link={false} />)}

          {isChinese && (
            <div className="card flex flex-col gap-2 p-4" aria-label={tr('Phân loại')}>
              <div className="flex flex-wrap gap-2">
                {khoExact ? <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-extrabold text-brand-strong">{tr('Thuộc danh sách nghiên cứu GYY')}</span> : <span className="rounded-full bg-soft px-3 py-1 text-sm font-bold text-muted">{tr('Không có trong kho GYY')}</span>}
                {ext.status === 'ok' && ext.entries.length === 0 && <span className="rounded-full bg-soft px-3 py-1 text-sm font-bold text-muted">{tr('Không tìm thấy trong từ điển mở rộng')}</span>}
              </div>
              {cls.state === 'A' && <p className="font-extrabold text-ok">{tr('Quán dụng ngữ (惯用语)')}: {tr('có căn cứ xác nhận')}</p>}
              {cls.state === 'B' && <p className="font-extrabold">{tr('Có căn cứ xác định thuộc loại khác')}</p>}
              {cls.state === 'C' && !khoExact && <p className="font-extrabold">{tr('Chưa đủ dữ liệu để xác định có phải quán dụng ngữ hay không')}</p>}
              {cls.state === 'A' && <p className="text-sm text-muted">{tr('Xác nhận bởi: {0}.', [cls.confirmedBy.map((id) => ver.sources.find((s) => s.id === id)?.short ?? id).join('; ')])}</p>}
              {cls.state === 'B' && cls.otherLabels.length > 0 && <p className="text-sm text-muted">{tr('Từ điển chuyên ngành ghi nhận cụm từ này với nhãn khác: {0}. Chưa có nguồn nào xác nhận đây cũng là 惯用语.', [cls.otherLabels.join('、')])}</p>}
              {cls.state === 'B' && cls.cedictIdiom && <p className="text-sm text-muted">{tr('CC-CEDICT đánh dấu đây là cụm cố định (idiom). Nhãn này không đồng nghĩa với 惯用语.')}</p>}
              {cls.state === 'C' && !khoExact && ext.status !== 'loading' && <p className="text-sm text-muted">{tr('Các nguồn đã tích hợp không có nhãn thành ngữ hay 惯用语 cho mục này. Đây không phải kết luận rằng nó không phải Quán dụng ngữ.')}</p>}
              {ext.status === 'loading' && <p className="text-sm text-muted">{tr('Đang tra cứu…')}</p>}
              {ext.status === 'unavailable' && <p className="text-sm text-muted">{tr('Chưa tải được từ điển mở rộng (bản này không có hoặc đang ngoại tuyến).')}</p>}
            </div>
          )}

          {/* Chữ Hán, có trong kho GYY: hiển thị bình thường, chỉ thêm nguồn tham khảo gọn */}
          {isChinese && khoExact && (
            <div className="flex flex-col gap-3">
              <div className="card p-4 sm:p-5"><IdiomDetail idiom={khoExact} /></div>
              <ReferenceSources sources={ver.sources} entry={entry} />
              <Link to={`/hoc/${khoExact.id}`} className="btn-primary self-start">{tr('Học bài này (4 bước)')}</Link>
            </div>
          )}

          {/* Chữ Hán, ngoài kho GYY */}
          {isChinese && !khoExact && ((hasRef || ext.entries.length > 0) ? (
            <div className="card flex flex-col gap-3 p-4 sm:p-5">
              <div><p className="han text-4xl font-bold leading-tight [overflow-wrap:anywhere]">{key}</p><p className="font-semibold text-brand-strong">{extPinyin || autoPy || '…'}</p></div>
              {ext.entries.length > 0 && <ExtEntries entries={ext.entries} meta={meta} />}
              {ev.state === 'verified' && <p className="font-bold text-ok">{tr('Có trong từ điển chuyên ngành về 惯用语')}</p>}
              {(evidence?.meaning || evidence?.example) && <div className="text-sm">{evidence.meaning && <p><b>{tr('Nghĩa / giải thích:')}</b> <span className="han">{evidence.meaning}</span></p>}{evidence.example && <p><b>{tr('Ví dụ:')}</b> <span className="han">{evidence.example}</span></p>}</div>}
              <ReferenceSources sources={ver.sources} entry={entry} />
              <p className="text-sm text-muted">{tr('Kết quả tra cứu chung không tự động trở thành ngữ liệu học chính thức của GYY.')}</p>
              <div className="flex flex-wrap gap-2">
                {alreadySaved ? <span className="font-bold text-ok">{tr('Đã lưu trong Từ vựng của tôi')}</span> : !saveOpen ? <button type="button" className="btn-primary" onClick={() => setSaveOpen(true)}>{tr('Thêm vào Từ vựng của tôi')}</button> : null}
                <button type="button" className="btn-soft" onClick={() => { suggest(); setSuggested(true) }} disabled={suggested}><Copy size={18} />{suggested ? tr('Đã lưu đề xuất') : tr('Đề xuất đưa vào kho GYY')}</button>
              </div>
              {saveOpen && (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1"><span className="font-bold">{tr('Nghĩa tiếng Việt (bạn tự ghi)')} <span className="text-bad">*</span></span><input className="input !text-base" value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={300} /></label>
                  <label className="flex flex-col gap-1"><span className="font-bold">{tr('Ghi chú cá nhân')}</span><textarea className="input !min-h-[80px] !text-base" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></label>
                  <div className="flex gap-2"><button type="button" className="btn-primary" onClick={saveCustom} disabled={meaning.trim().length < 2}>{tr('Lưu')}</button><button type="button" className="btn-ghost" onClick={() => setSaveOpen(false)}>{tr('Hủy')}</button></div>
                </div>
              )}
            </div>
          ) : (ext.status === 'loading' ? null : <NotFound term={key} tr={tr} link />))}

          {isChinese && khoRelated.length > 0 && (
            <div><p className="text-sm font-bold text-muted">{tr('Mục gần giống trong kho')}</p><ul className="mt-1 flex flex-wrap gap-2">{khoRelated.map((n) => <li key={n.id}><Link to={`/tu/${n.id}`} className="chip han !min-h-[44px] !px-4 !text-base">{n.hanzi}</Link></li>)}</ul></div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-extrabold">{tr('Lịch sử tra cứu')}</h2>{ver.history.length > 0 && <button type="button" className="text-sm font-bold text-bad" onClick={() => ver.clearHistory()}>{tr('Xóa lịch sử')}</button>}</div>
        {ver.history.length === 0 ? <EmptyState title={tr('Chưa có lượt tra cứu nào')}>{tr('Các cụm từ bạn đã tra sẽ hiện ở đây để xem lại.')}</EmptyState> : (
          <ul className="flex flex-wrap gap-2">{ver.history.map((h) => (
            <li key={h.term}><button type="button" className="chip han !min-h-[44px] !px-4 !text-base font-bold" onClick={(e) => submit(e as unknown as FormEvent, h.term)}>{h.term}</button></li>
          ))}</ul>
        )}
      </section>
    </div>
  )
}

function NotFound({ term, tr, link }: { term: string; tr: (k: string, a?: unknown[]) => string; link: boolean }) {
  const key = termKey(term) || term
  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <p className="font-bold">{tr('Chưa có kết quả phù hợp trong kho GYY. Bạn có thể thử từ khóa khác hoặc mở nguồn tham khảo.')}</p>
      {link && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted">{tr('Mở nguồn tham khảo:')}</span>
          {EXTERNAL(key).map((x) => <a key={x.name} className="inline-flex items-center gap-1 font-bold text-brand-strong underline" href={x.url} target="_blank" rel="noopener noreferrer">{x.name} <ExternalLink size={14} /></a>)}
        </div>
      )}
    </div>
  )
}

/** Các mục từ điển mở rộng cho một từ (nguyên văn nguồn, kèm giấy phép). */
function ExtEntries({ entries, meta }: { entries: ExtEntry[]; meta: ExtMeta | null }) {
  const { t: tr } = useI18n()
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-3">
      <p className="text-sm font-extrabold text-muted">{tr('Từ điển mở rộng (CC-CEDICT)')}</p>
      {entries.map((e, i) => {
        const sn = splitSenses(e.d)
        return (
          <div key={i} className="flex flex-col gap-1 text-sm">
            <p className="font-semibold text-brand-strong">{pinyinMarks(e.p)}</p>
            <ul className="list-disc pl-5">{[...sn.other, ...sn.literal, ...sn.figurative].map((d, k) => <li key={k} lang="en">{d}</li>)}</ul>
            {sn.literal.length > 0 && <p className="text-xs text-muted">{tr('Nghĩa đen và nghĩa bóng được ghi theo đúng ký hiệu của nguồn (lit. / fig.).')}</p>}
          </div>
        )
      })}
      <p className="text-xs text-muted">{meta ? tr('Dữ liệu: CC-CEDICT © MDBG, giấy phép CC BY-SA 4.0 (bản {0}). Nghĩa tiếng Anh giữ nguyên văn từ nguồn.', [meta.date?.slice(0, 10) ?? '']) : tr('Dữ liệu: CC-CEDICT © MDBG, giấy phép CC BY-SA 4.0.')}</p>
    </div>
  )
}
