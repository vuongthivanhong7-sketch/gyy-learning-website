import { playComplete } from '../lib/sound'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PenLine, ArrowDownUp, Blocks, Layers, ListChecks, MessageSquareText, Puzzle, Search, type LucideIcon } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { resolveIdiom, useUserData } from '../store/UserData'
import { DemoBanner, EmptyState } from '../components/ui'
import { Page } from '../components/Layout'
import { pick } from '../lib/random'
import { isHan, normalizePinyin, normalizeVi } from '../lib/text'
import { learnStatus } from '../lib/status'
import { idiomSources, idiomTopics, type ExerciseType, type Idiom } from '../types'
import { ChoiceGame, ClozeGame, MatchGame, PairsGame, SentenceGame, clozeEligible, orderEligible, type ExProps } from './exercises'
import { useI18n } from '../i18n'

type Single = Exclude<ExerciseType, 'mixed'>
export const EX: Record<Single, { title: string; desc: string; icon: LucideIcon; min: number; cap: number; mixedN: number; Comp: (p: ExProps) => React.ReactElement }> = {
  pairs: { title: 'Tìm mảnh ghép giống nhau', desc: 'Lật thẻ để ghép mỗi Quán dụng ngữ với nghĩa bóng tương ứng.', icon: Puzzle, min: 3, cap: 6, mixedN: 6, Comp: PairsGame },
  match: { title: 'Nối Quán dụng ngữ với nghĩa', desc: 'Hai cột song song: nối từng Quán dụng ngữ với nghĩa tương ứng.', icon: Blocks, min: 3, cap: 5, mixedN: 5, Comp: MatchGame },
  choice: { title: 'Chọn đáp án đúng', desc: 'Câu hỏi về nghĩa, cách dùng và ngữ cảnh, có giải thích sau mỗi câu.', icon: ListChecks, min: 1, cap: Infinity, mixedN: 5, Comp: ChoiceGame },
  sentence: { title: 'Sắp xếp câu', desc: 'Sắp xếp các cụm từ tiếng Trung đã xáo trộn thành câu đúng; chấm bằng đáp án có sẵn, không dùng AI.', icon: ArrowDownUp, min: 1, cap: Infinity, mixedN: 4, Comp: SentenceGame },
  cloze: { title: 'Hoàn thành đoạn văn', desc: 'Điền Quán dụng ngữ thích hợp vào các chỗ trống trong đoạn văn.', icon: MessageSquareText, min: 2, cap: 4, mixedN: 4, Comp: ClozeGame },
}
const ORDER: Single[] = ['pairs', 'match', 'choice', 'sentence', 'cloze']
export const TITLES: Record<ExerciseType, string> = { ...Object.fromEntries(ORDER.map((t) => [t, EX[t].title])) as Record<Single, string>, mixed: 'Kết hợp năm dạng bài' }

type Scope = 'all' | 'learned' | 'pick' | 'due'
interface Stage { type: Single; items: Idiom[] }

function eligibleFor(t: Single, items: Idiom[], poolSize: number): Idiom[] {
  if (t === 'cloze') return items.filter(clozeEligible)
  if (t === 'sentence') return items.filter(orderEligible)
  if (t === 'choice' && poolSize < 4) return []
  return items
}
/** Chia thành các lượt nhỏ (vd. 6 cặp mỗi lượt). Lượt cuối thiếu thì bù thêm mục từ các lượt trước. */
function stagesFor(t: Single, items: Idiom[], n: number, poolSize: number): Stage[] {
  const { min, cap } = EX[t]
  const el = pick(eligibleFor(t, items, poolSize), n)
  if (el.length < min) return []
  const groups: Idiom[][] = []
  for (let i = 0; i < el.length; i += cap) groups.push(el.slice(i, i + cap))
  const last = groups[groups.length - 1]
  if (groups.length > 1 && last.length < min) last.push(...el.filter((x) => !last.includes(x)).slice(0, min - last.length))
  return groups.map((g) => ({ type: t, items: g }))
}

export default function Practice() {
  const { t: tr, tx: trx } = useI18n()
  const [params] = useSearchParams()
  const { idioms, isDemo, topics, sources } = useIdioms()
  const ud = useUserData()
  const initScope = params.get('pham-vi')
  const [scope, setScope] = useState<Scope>(initScope === 'learned' || initScope === 'pick' || initScope === 'due' ? initScope : 'all')
  const [topic, setTopic] = useState(params.get('chude') ?? '')
  const [source, setSource] = useState(params.get('nguon') ?? '')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [type, setType] = useState<ExerciseType>('mixed')
  const [count, setCount] = useState(10)
  const [run, setRun] = useState<{ plan: Stage[]; idx: number; key: number; acc: { correct: number; xp: number; total: number; wrong: string[]; parts: { type: Single; correct: number; total: number }[] } } | null>(null)
  const [result, setResult] = useState<{ correct: number; total: number; wrong: string[]; parts: { type: Single; correct: number; total: number }[]; saved: boolean } | null>(null)

  // Mở từ nút ôn tập trong "Từ vựng của tôi": chọn sẵn các mục đã lưu (một lần, sau khi dữ liệu tải xong).
  const preselected = useRef(false)
  useEffect(() => {
    if (preselected.current || ud.loading || params.get('chon') !== 'saved') return
    preselected.current = true
    setPicked(new Set(Object.values(ud.state.progress).filter((p) => p.saved).map((p) => p.idiomId)))
  }, [ud.loading, ud.state.progress, params])

  const custom = ud.state.custom
  const inFilter = (i: Idiom) => (!topic || idiomTopics(i).includes(topic)) && (!source || idiomSources(i).includes(source))
  const allItems = useMemo(() => idioms.filter(inFilter), [idioms, topic, source]) // eslint-disable-line react-hooks/exhaustive-deps
  const learnedItems = useMemo(() => idioms.filter((i) => learnStatus(ud.progressOf(i.id)) === 'learned' && inFilter(i)), [idioms, ud, topic, source]) // eslint-disable-line react-hooks/exhaustive-deps
  const dueItems = useMemo(() => ud.dueIds.map((id) => resolveIdiom(idioms, custom, id)).filter((i): i is Idiom => !!i && i.origin !== 'lookup' && inFilter(i)), [ud.dueIds, idioms, custom, topic, source]) // eslint-disable-line react-hooks/exhaustive-deps
  const savedCustom = useMemo(() => custom.filter((c) => ud.isSaved(c.id)), [custom, ud])
  const pickPool = useMemo<Idiom[]>(() => [...idioms, ...savedCustom], [idioms, savedCustom])
  const pickList = useMemo(() => {
    const t = q.trim()
    return pickPool.filter((i) => {
      if (!inFilter(i)) return false
      if (!t) return true
      if (Array.from(t).some(isHan)) return i.hanzi.includes(t)
      const py = normalizePinyin(t)
      return (py.length > 0 && normalizePinyin(i.pinyin).includes(py)) || normalizeVi(i.meaningVi).includes(normalizeVi(t))
    })
  }, [pickPool, q, topic, source]) // eslint-disable-line react-hooks/exhaustive-deps
  const pickedItems = useMemo(() => pickPool.filter((i) => picked.has(i.id)), [pickPool, picked])
  const scopeItems = scope === 'all' ? allItems : scope === 'learned' ? learnedItems : scope === 'due' ? dueItems : pickedItems

  const eligibleCount = (t: Single) => eligibleFor(t, scopeItems, idioms.length).length
  const usable = (t: Single) => eligibleCount(t) >= EX[t].min
  const typeOk = (t: ExerciseType) => (t === 'mixed' ? ORDER.some(usable) : usable(t))
  const maxN = type === 'mixed' ? 0 : eligibleCount(type)
  const countOptions = useMemo(() => {
    if (type === 'mixed' || maxN < EX[type].min) return []
    const base = [5, 10, 20, 30].filter((n) => n >= EX[type].min && n < maxN)
    return [...base, maxN]
  }, [type, maxN])
  const effCount = countOptions.includes(count) ? count : countOptions[Math.min(1, countOptions.length - 1)] ?? 0

  const buildPlan = (): Stage[] => (type === 'mixed' ? ORDER.flatMap((t) => stagesFor(t, scopeItems, EX[t].mixedN, idioms.length)) : stagesFor(type, scopeItems, effCount, idioms.length))
  const planPreview = useMemo(buildPlan, [type, scopeItems, effCount, idioms.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const canStart = scopeItems.length > 0 && typeOk(type) && planPreview.length > 0

  const start = () => {
    const plan = buildPlan()
    if (plan.length === 0) return
    setResult(null)
    setRun({ plan, idx: 0, key: Date.now(), acc: { correct: 0, xp: 0, total: 0, wrong: [], parts: [] } })
  }
  const stageDone = (correct: number, total: number, wrongIds: string[] = [], xpCorrect: number = correct) => {
    if (!run) return
    const stage = run.plan[run.idx]
    const acc = { correct: run.acc.correct + correct, xp: run.acc.xp + xpCorrect, total: run.acc.total + total, wrong: [...new Set([...run.acc.wrong, ...wrongIds])], parts: [...run.acc.parts, { type: stage.type, correct, total }] }
    if (run.idx + 1 < run.plan.length) { setRun({ ...run, idx: run.idx + 1, key: Date.now(), acc }); return }
    const ids = [...new Set(run.plan.flatMap((s) => s.items.map((i) => i.id)))]
    // Chỉ ghi lịch sử luyện tập; KHÔNG đổi trạng thái "đã học" của bất kỳ mục nào.
    const saved = ud.recordRun({ type: run.plan.length > 1 && new Set(run.plan.map((s) => s.type)).size > 1 ? 'mixed' : stage.type, total: acc.total, correct: acc.correct, xpCorrect: acc.xp, topic: source || topic || undefined, idiomIds: ids })
    if (acc.correct > 0) playComplete()
    setResult({ ...acc, saved })
    setRun(null)
  }

  if (run) {
    const stage = run.plan[run.idx]
    const { Comp } = EX[stage.type]
    return (
      <Page title={tr(EX[stage.type].title)} subtitle={run.plan.length > 1 ? tr("Phần {0}/{1}", [run.idx + 1, run.plan.length]) : undefined} actions={<button type="button" className="btn-ghost !min-h-[44px]" onClick={() => setRun(null)}>{tr("Thoát")}</button>}>
        <div className="mx-auto w-full max-w-2xl"><Comp key={run.key} items={stage.items} pool={idioms} onFinish={stageDone} /></div>
      </Page>
    )
  }

  if (result) {
    const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0
    const wrongItems = result.wrong.map((id) => resolveIdiom(idioms, custom, id)).filter((i): i is Idiom => !!i)
    return (
      <Page title={tr("Kết quả luyện tập")} subtitle={tr(TITLES[type])}>
        <div className="card mx-auto flex w-full max-w-2xl flex-col gap-4 p-5">
          <p className="text-center text-5xl font-extrabold text-brand-strong">{result.correct}/{result.total}</p>
          <p className="text-center font-bold text-muted">{trx("Tỉ lệ đúng {0}%", [pct])}</p>
          {!result.saved && <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">{tr("Kết quả chưa được lưu vì bạn chưa đăng nhập.")}</p>}
          {result.parts.length > 1 && <ul className="flex flex-col gap-1.5 text-sm">{result.parts.map((p, k) => <li key={k} className="flex justify-between gap-3 rounded-xl bg-soft px-3 py-2"><span>{tr(EX[p.type].title)}</span><b>{p.correct}/{p.total}</b></li>)}</ul>}
          <div>
            <p className="mb-2 font-extrabold">{trx("Cần xem lại ({0})", [wrongItems.length])}</p>
            {wrongItems.length === 0 ? <p className="text-muted">{tr("Không có mục nào trả lời sai ở các dạng có chấm theo từng mục.")}</p> : (
              <ul className="flex flex-col gap-1.5">{wrongItems.map((i) => <li key={i.id}><Link to={`/tu/${i.id}`} className="flex items-baseline gap-3 rounded-xl bg-bad-soft px-3 py-2"><b className="han text-lg">{i.hanzi}</b><span className="min-w-0 flex-1 truncate text-sm">{i.meaningVi}</span></Link></li>)}</ul>
            )}
          </div>
          <p className="text-sm text-muted">{tr("Làm bài luyện tập không tự đánh dấu Quán dụng ngữ là “đã học”. Muốn hoàn thành bài học, hãy đi qua đủ bốn bước ở tab Học.")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-primary" onClick={start}>{tr("Luyện lại")}</button>
            <button type="button" className="btn-ghost" onClick={() => setResult(null)}>{tr("Đổi phạm vi / hình thức")}</button>
          </div>
        </div>
      </Page>
    )
  }

  const scopes: { key: Scope; title: string; desc: string; n: number }[] = [
    { key: 'all', title: tr("Toàn bộ kho Quán dụng ngữ"), desc: tr("Cả mục chưa học và đã học, có thể lọc theo chủ đề hoặc sách."), n: allItems.length },
    { key: 'learned', title: tr("Những mục đã học"), desc: tr("Chỉ các mục bạn đã hoàn thành đủ bốn bước học."), n: learnedItems.length },
    { key: 'pick', title: tr("Tự chọn từng mục"), desc: tr("Chọn chính xác những Quán dụng ngữ muốn luyện."), n: pickedItems.length },
    { key: 'due', title: tr("Đến hạn ôn tập"), desc: tr("Các mục đến hạn theo lịch lặp lại ngắt quãng (SRS)."), n: dueItems.length },
  ]
  const typeRows: { key: ExerciseType; title: string; desc: string; icon: LucideIcon; n: number; min: number }[] = [
    { key: 'mixed', title: tr("Kết hợp năm dạng bài"), desc: tr("Mỗi dạng một lượt, theo thứ tự."), icon: Layers, n: ORDER.filter(usable).length, min: 1 },
    ...ORDER.map((t) => ({ key: t as ExerciseType, title: EX[t].title, desc: EX[t].desc, icon: EX[t].icon, n: eligibleCount(t), min: EX[t].min })),
  ]
  const planByType = ORDER.map((t) => ({ t, rounds: planPreview.filter((s) => s.type === t) })).filter((x) => x.rounds.length)
  const totalItems = planPreview.reduce((n, s) => n + s.items.length, 0)

  return (
    <Page title={tr("Luyện tập Quán dụng ngữ")} subtitle={tr("Luyện tập tổng hợp: chọn phạm vi, hình thức và số lượng rồi bắt đầu.")}>
      {isDemo && <DemoBanner />}
      {idioms.length === 0 ? <EmptyState title={tr("Chưa có dữ liệu để luyện tập")}>{tr("Hãy nạp ngữ liệu để tạo bài tập.")}</EmptyState> : (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="h-scope">
            <h2 id="h-scope" className="text-xl font-extrabold">{tr("1. Chọn phạm vi")}</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={tr("Phạm vi luyện tập")}>
              {scopes.map((s) => (
                <button key={s.key} type="button" role="radio" aria-checked={scope === s.key} onClick={() => setScope(s.key)}
                  className={`card flex flex-col gap-1 p-4 text-left transition ${scope === s.key ? '!border-brand ring-2 ring-brand/30' : ''}`}>
                  <span className="flex items-center justify-between gap-2"><span className="text-lg font-extrabold leading-snug">{tr(s.title)}</span><span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-extrabold text-brand-strong">{s.n}</span></span>
                  <span className="text-[15px] text-muted">{tr(s.desc)}</span>
                </button>
              ))}
            </div>
            {(topics.length > 0 || sources.length > 0) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {topics.length > 0 && <select className="input !min-h-[48px] !text-base" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={tr("Lọc theo chủ đề")}><option value="">{tr("Tất cả chủ đề")}</option>{topics.map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select>}
                {sources.length > 0 && <select className="input !min-h-[48px] !text-base" value={source} onChange={(e) => setSource(e.target.value)} aria-label={tr("Lọc theo sách")}><option value="">{tr("Tất cả sách")}</option>{sources.map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select>}
              </div>
            )}
            {scope === 'learned' && learnedItems.length === 0 && (
              <EmptyState title={tr("Bạn chưa học xong Quán dụng ngữ nào")} action={<Link to="/hoc" className="btn-primary">{tr("Đi tới danh sách bài học")}</Link>}>{tr("Một mục chỉ được tính là “đã học” khi bạn hoàn thành đủ bốn bước. Mục chưa học sẽ không được đưa vào phạm vi này.")}</EmptyState>
            )}
            {scope === 'due' && dueItems.length === 0 && <EmptyState title={tr("Chưa có mục nào đến hạn ôn tập")}>{tr("Khi bạn lưu Quán dụng ngữ vào sổ tay hoặc đánh giá mức nhớ sau bài học, lịch ôn sẽ xuất hiện ở đây.")}</EmptyState>}
            {scope === 'pick' && (
              <div className="card flex flex-col gap-3 p-3 sm:p-4">
                <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                  <input className="input han !min-h-[48px] !pl-11 !text-base" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Tìm chữ Hán, pinyin hoặc nghĩa…")} aria-label={tr("Tìm trong danh sách chọn")} /></div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-soft !min-h-[44px] !px-4 !text-sm" onClick={() => setPicked((s) => new Set([...s, ...pickList.map((i) => i.id)]))} disabled={pickList.length === 0}>{trx("Chọn tất cả kết quả ({0})", [pickList.length])}</button>
                  <button type="button" className="btn-ghost !min-h-[44px] !px-4 !text-sm" onClick={() => setPicked(new Set())} disabled={picked.size === 0}>{tr("Bỏ chọn tất cả")}</button>
                  <span className="ml-auto text-sm font-extrabold text-brand-strong" aria-live="polite">{trx("Đã chọn {0} mục", [picked.size])}</span>
                </div>
                <ul className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto overscroll-contain pr-1">
                  {pickList.length === 0 && <li className="p-3 text-muted">{tr("Không có mục nào khớp.")}</li>}
                  {pickList.map((i) => (
                    <li key={i.id}><label className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 ${picked.has(i.id) ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" checked={picked.has(i.id)} onChange={() => setPicked((s) => { const n = new Set(s); n.has(i.id) ? n.delete(i.id) : n.add(i.id); return n })} />
                      <span className="han w-24 shrink-0 text-lg font-bold leading-tight">{i.hanzi}</span>
                      <span className="line-clamp-2 min-w-0 flex-1 text-sm text-muted">{i.meaningVi}</span>
                    </label></li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="h-type">
            <h2 id="h-type" className="text-xl font-extrabold">{tr("2. Chọn hình thức")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {typeRows.map((e) => {
                const ok = e.key === 'mixed' ? e.n > 0 : e.n >= e.min
                return (
                  <button key={e.key} type="button" disabled={!ok} onClick={() => setType(e.key)} aria-pressed={type === e.key}
                    className={`card flex items-start gap-3 p-4 text-left transition disabled:opacity-50 ${type === e.key ? '!border-brand ring-2 ring-brand/30' : ''}`}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong"><e.icon size={24} /></span>
                    <span className="min-w-0"><span className="block text-lg font-extrabold leading-snug">{tr(e.title)}</span><span className="block text-[15px] text-muted">{tr(e.desc)}</span>
                      <span className={`mt-1 block text-sm font-bold ${ok ? 'text-brand-strong' : 'text-warn'}`}>{e.key === 'mixed' ? tr("{0}/5 dạng dùng được với phạm vi này", [e.n]) : ok ? tr("{0} mục dùng được", [e.n]) : tr("Cần ít nhất {0} mục phù hợp (hiện có {1})", [e.min, e.n])}</span></span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="card flex flex-col gap-4 p-4 sm:p-5" aria-labelledby="h-sum">
            <h2 id="h-sum" className="text-xl font-extrabold">{tr("3. Số lượng và tóm tắt")}</h2>
            {type !== 'mixed' && (countOptions.length === 0 ? <p className="font-semibold text-warn">{tr("Phạm vi này chưa đủ mục cho dạng bài đã chọn.")}</p> : (
              <label className="flex max-w-xs flex-col gap-1.5"><span className="font-bold">{tr("Số mục")}</span>
                <select className="input !min-h-[48px] !text-base" value={effCount} onChange={(e) => setCount(+e.target.value)}>{countOptions.map((n) => <option key={n} value={n}>{n === maxN ? tr("Tất cả ({0})", [n]) : n}</option>)}</select></label>
            ))}
            <dl className="grid gap-x-4 gap-y-1.5 text-[15px] sm:grid-cols-[9rem_1fr]">
              <dt className="font-bold text-muted">{tr("Phạm vi")}</dt><dd>{trx("{0} ({1} mục)", [tr(scopes.find((s) => s.key === scope)!.title), scopeItems.length])}</dd>
              {topics.length > 0 && <><dt className="font-bold text-muted">{tr("Chủ đề")}</dt><dd>{topic || tr("Tất cả")}</dd></>}
              {sources.length > 0 && <><dt className="font-bold text-muted">{tr("Sách")}</dt><dd className="han !break-words">{source || tr("Tất cả")}</dd></>}
              <dt className="font-bold text-muted">{tr("Hình thức")}</dt><dd>{tr(TITLES[type])}</dd>
              <dt className="font-bold text-muted">{tr("Số lượng")}</dt><dd>{planPreview.length === 0 ? tr("Chưa có mục hợp lệ") : type === 'mixed' ? tr("Mỗi dạng một lượt: {0}", [planByType.map((x) => `${tr(EX[x.t].title)} (${x.rounds.reduce((n, s) => n + s.items.length, 0)})`).join(', ')]) : tr("{0} mục{1}", [totalItems, planPreview.length > 1 ? tr(", chia {0} lượt", [planPreview.length]) : ''])}</dd>
            </dl>
            <button type="button" className="btn-primary w-full sm:w-auto sm:self-start" disabled={!canStart} onClick={start}>{tr("Bắt đầu luyện tập")}</button>
            {!canStart && <p className="text-sm text-muted">{tr("Nút sẽ bật khi phạm vi có đủ mục hợp lệ cho hình thức đã chọn.")}</p>}
          </section>
          <History />
        </>
      )}
    </Page>
  )
}

function History() {
  const { t: tr } = useI18n()
  const { state } = useUserData()
  const runs = state.runs.slice(0, 8)
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-extrabold">{tr("Lịch sử luyện tập")}</h2>
      {runs.length === 0 ? <p className="text-muted">{tr("Chưa có lần luyện tập nào. Hoàn thành một bài để xem lịch sử tại đây.")}</p> : (
        <ul className="flex flex-col gap-2">{runs.map((r) => (
          <li key={r.id} className="card flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0"><span className="block font-bold">{tr(TITLES[r.type])}</span><span className="text-sm text-muted">{new Date(r.ts).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}{r.topic ? ` · ${r.topic}` : ''}</span></span>
            <span className="shrink-0 text-lg font-extrabold text-brand-strong">{r.correct}/{r.total}</span>
          </li>))}</ul>
      )}
    </section>
  )
}
