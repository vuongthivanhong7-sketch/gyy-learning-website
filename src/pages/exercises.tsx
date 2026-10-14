import { playCorrect } from '../lib/sound'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Idiom } from '../types'
import { pick, shuffle } from '../lib/random'
import { useMeaning } from '../lib/meaning'
import { useUserData } from '../store/UserData'
import { orderPuzzle } from '../lib/chunks'
import { SpeakButton } from '../components/ui'
import { useI18n } from '../i18n'

export interface ExProps { items: Idiom[]; pool: Idiom[]; onFinish: (correct: number, total: number, wrongIds?: string[], xpCorrect?: number) => void }

/* ───────── Dạng 1: tìm mảnh ghép giống nhau (Quán dụng ngữ ↔ nghĩa bóng) ───────── */
interface PCard { key: string; idiomId: string; kind: 'han' | 'meaning'; text: string }
export function PairsGame({ items, onFinish }: ExProps) {
  const { t: tr, tx: trx } = useI18n()
  const cards = useMemo<PCard[]>(() => shuffle(items.flatMap((i) => [
    { key: `${i.id}-h`, idiomId: i.id, kind: 'han' as const, text: i.hanzi },
    { key: `${i.id}-m`, idiomId: i.id, kind: 'meaning' as const, text: i.figurative || i.meaningVi },
  ])), [items])
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)
  const [wrongFlash, setWrongFlash] = useState(false)
  const lock = useRef(false)
  const done = matched.size === items.length

  const tap = (c: PCard) => {
    if (lock.current || open.includes(c.key) || matched.has(c.idiomId)) return
    const next = [...open, c.key]
    setOpen(next)
    if (next.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = next.map((k) => cards.find((x) => x.key === k)!)
      if (a.idiomId === b.idiomId && a.kind !== b.kind) { setMatched((m) => new Set(m).add(a.idiomId)); setOpen([]); playCorrect() }
      else { lock.current = true; setWrongFlash(true); setTimeout(() => { setOpen([]); setWrongFlash(false); lock.current = false }, 1200) }
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3 font-bold text-brand-strong">
        <span>{trx("Đã ghép: {0}/{1}", [matched.size, items.length])}</span><span>{trx("Lượt lật: {0}", [moves])}</span>
      </div>
      <p className="text-muted">{tr("Lật hai thẻ để tìm cặp: một Quán dụng ngữ và nghĩa bóng tương ứng của nó.")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((c) => {
          const shown = open.includes(c.key) || matched.has(c.idiomId)
          const ok = matched.has(c.idiomId)
          const tone = ok ? 'border-ok bg-ok-soft text-ok' : shown ? (wrongFlash && open.length === 2 ? 'border-bad bg-bad-soft' : 'border-brand bg-brand-soft') : 'border-line bg-brand'
          return (
            <button key={c.key} type="button" onClick={() => tap(c)} aria-label={shown ? c.text : tr("Thẻ úp")}
              className={`relative flex min-h-[96px] items-center justify-center rounded-2xl border-2 p-2.5 text-center font-bold transition ${tone}`}>
              {/* Luôn dựng nội dung để kích thước thẻ không nhảy khi lật */}
              <span className={`${c.kind === 'han' ? 'han text-2xl' : 'text-[13px] font-semibold leading-snug sm:text-sm'} ${shown ? '' : 'invisible'}`}>{c.text}</span>
              {!shown && <span className="absolute inset-0 flex items-center justify-center text-3xl text-on-brand" aria-hidden>?</span>}
            </button>
          )
        })}
      </div>
      {done && (
        <div className="rounded-2xl bg-ok-soft p-4 font-bold text-ok" role="status">
          {trx("Hoàn thành sau {0} lượt lật!", [moves])}<button type="button" className="btn-primary mt-3 w-full" onClick={() => onFinish(items.length, Math.max(moves, items.length))}>{tr("Xem kết quả")}</button>
        </div>
      )}
    </div>
  )
}

/* ───────── Dạng 2: nối Quán dụng ngữ với nghĩa (hai cột) ───────── */
const PAIR_COLORS = ['#2F6199', '#0B7A56', '#9A5200', '#C42B3C', '#0A7084', '#4E6D8A', '#6B7A1E', '#B8572A']
export function MatchGame({ items, onFinish }: ExProps) {
  const { t: tr, tx: trx } = useI18n()
  const left = useMemo(() => shuffle(items), [items])
  const right = useMemo(() => shuffle(items), [items])
  const [pairs, setPairs] = useState<Record<string, string>>({}) // leftId → rightId
  const [order, setOrder] = useState<string[]>([]) // thứ tự nối để đánh số
  const [sel, setSel] = useState<{ side: 'l' | 'r'; id: string } | null>(null)
  const [checked, setChecked] = useState(false)

  const rightOwner = (rid: string) => Object.keys(pairs).find((l) => pairs[l] === rid)
  const num = (leftId: string) => order.indexOf(leftId)

  const connect = (l: string, r: string) => {
    setPairs((p) => ({ ...p, [l]: r })); setOrder((o) => [...o, l]); setSel(null)
  }
  const unpair = (l: string) => {
    setPairs((p) => { const n = { ...p }; delete n[l]; return n }); setOrder((o) => o.filter((x) => x !== l)); setSel(null)
  }
  const tapLeft = (id: string) => {
    if (checked) return
    if (pairs[id]) return unpair(id)
    if (sel?.side === 'r') return connect(id, sel.id)
    setSel({ side: 'l', id })
  }
  const tapRight = (id: string) => {
    if (checked) return
    const owner = rightOwner(id)
    if (owner) return unpair(owner)
    if (sel?.side === 'l') return connect(sel.id, id)
    setSel({ side: 'r', id })
  }
  const allPaired = Object.keys(pairs).length === items.length
  const correct = Object.entries(pairs).filter(([l, r]) => l === r).length
  const reset = () => { setPairs({}); setOrder([]); setSel(null); setChecked(false) }

  const style = (id: string, side: 'l' | 'r') => {
    const lid = side === 'l' ? id : rightOwner(id)
    const paired = !!lid && !!pairs[lid]
    const n = lid ? num(lid) : -1
    const color = n >= 0 ? PAIR_COLORS[n % PAIR_COLORS.length] : undefined
    const selected = sel?.side === side && sel.id === id
    let ok: boolean | undefined
    if (checked && lid) ok = pairs[lid] === lid
    return { paired, n, color, selected, ok }
  }
  const Cell = ({ id, side, children }: { id: string; side: 'l' | 'r'; children: React.ReactNode }) => {
    const s = style(id, side)
    return (
      <button key={`${side}-${id}`} type="button" onClick={() => (side === 'l' ? tapLeft(id) : tapRight(id))}
        className={`relative flex min-h-[64px] w-full items-center gap-2 rounded-2xl border-2 px-2.5 py-2 text-left transition sm:px-4 ${s.ok === true ? 'bg-ok-soft' : s.ok === false ? 'bg-bad-soft' : s.selected ? 'bg-brand-soft' : 'bg-card'} ${!s.paired && !s.selected ? 'border-line' : ''}`}
        style={s.paired ? { borderColor: s.ok === undefined ? s.color : s.ok ? 'rgb(var(--ok))' : 'rgb(var(--bad))' } : s.selected ? { borderColor: 'rgb(var(--brand))' } : undefined}>
        {s.paired && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white" style={{ background: s.color }}>{s.n + 1}</span>}
        <span className="min-w-0 flex-1">{children}</span>
        {s.ok === true && <Check size={18} className="shrink-0 text-ok" />}
        {s.ok === false && <X size={18} className="shrink-0 text-bad" />}
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{tr("Chạm một Quán dụng ngữ ở cột trái, rồi chạm nghĩa tương ứng ở cột phải. Chạm lại mục đã nối để hủy.")}</p>
      <div className="grid grid-cols-2 gap-x-3 sm:gap-x-10">
        <div className="flex flex-col gap-2"><p className="text-center text-sm font-extrabold text-brand-strong">{tr("Quán dụng ngữ")}</p>
          {left.map((i) => Cell({ id: i.id, side: 'l', children: <span className="han block text-lg font-bold leading-tight sm:text-2xl">{i.hanzi}</span> }))}
        </div>
        <div className="flex flex-col gap-2"><p className="text-center text-sm font-extrabold text-brand-strong">{tr("Nghĩa tiếng Việt")}</p>
          {right.map((i) => Cell({ id: i.id, side: 'r', children: <span className="block text-[13px] font-semibold leading-snug sm:text-base">{i.meaningVi}</span> }))}
        </div>
      </div>
      {!checked ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost" onClick={reset}>{tr("Nối lại từ đầu")}</button>
          <button type="button" className="btn-primary" disabled={!allPaired} onClick={() => { setChecked(true); if (correct === items.length) playCorrect() }}>{tr("Kiểm tra")}</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-brand-soft p-4 font-bold text-brand-strong" role="status">{trx("Đúng {0}/{1} cặp.", [correct, items.length])}</div>
          {correct < items.length && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {items.filter((i) => pairs[i.id] !== i.id).map((i) => <li key={i.id} className="rounded-xl bg-bad-soft px-3 py-2"><b className="han">{i.hanzi}</b>: {i.meaningVi}</li>)}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={reset}>{tr("Nối lại")}</button>
            <button type="button" className="btn-primary" onClick={() => onFinish(correct, items.length, items.filter((i) => pairs[i.id] !== i.id).map((i) => i.id))}>{tr("Xem kết quả")}</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────── Dạng 3: chọn đáp án đúng ───────── */
interface Q { kind: 'meaning' | 'reverse' | 'context'; idiom: Idiom; options: { id: string; text: string; han?: boolean }[]; prompt: string }
function buildQuestions(items: Idiom[], pool: Idiom[]): Q[] {
  const { t: tr } = useI18n()
  return items.map((idiom, n) => {
    const others = pick(pool.filter((p) => p.id !== idiom.id), 3)
    const ex = idiom.examples.find((e) => e.zh.includes(idiom.hanzi))
    const kinds: Q['kind'][] = ex ? ['meaning', 'reverse', 'context'] : ['meaning', 'reverse']
    const kind = kinds[n % kinds.length]
    if (kind === 'meaning') return { kind, idiom, prompt: tr("Chọn nghĩa đúng nhất của Quán dụng ngữ này"), options: shuffle([idiom, ...others]).map((o) => ({ id: o.id, text: o.meaningVi })) }
    if (kind === 'reverse') return { kind, idiom, prompt: tr("Quán dụng ngữ nào có nghĩa: “{0}”?", [idiom.meaningVi]), options: shuffle([idiom, ...others]).map((o) => ({ id: o.id, text: o.hanzi, han: true })) }
    return { kind, idiom, prompt: tr("Chọn Quán dụng ngữ điền vào chỗ trống"), options: shuffle([idiom, ...others]).map((o) => ({ id: o.id, text: o.hanzi, han: true })) }
  })
}
export function ChoiceGame({ items, pool, onFinish }: ExProps) {
  const { t: tr, tx: trx } = useI18n()
  const qs = useMemo(() => buildQuestions(items, pool), [items, pool])
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const q = qs[i]
  const ex = q.idiom.examples.find((e) => e.zh.includes(q.idiom.hanzi))
  const answer = (id: string) => { if (chosen) return; setChosen(id); if (id === q.idiom.id) { setScore((s) => s + 1); playCorrect() } else setWrong((w) => [...w, q.idiom.id]) }
  const next = () => { if (i + 1 < qs.length) { setI(i + 1); setChosen(null) } else onFinish(score, qs.length, wrong) }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between font-bold text-brand-strong"><span>{trx("Câu {0}/{1}", [i + 1, qs.length])}</span><span>{trx("Đúng: {0}", [score])}</span></div>
      <div className="rounded-2xl bg-brand-soft p-4 text-center">
        <p className="font-bold text-brand-strong">{q.prompt}</p>
        {q.kind === 'meaning' && <p className="han mt-2 text-4xl font-bold">{q.idiom.hanzi}<span className="ml-2 inline-block align-middle"><SpeakButton idiom={q.idiom} /></span></p>}
        {q.kind === 'meaning' && <p className="mt-1 text-brand-strong">{q.idiom.pinyin}</p>}
        {q.kind === 'context' && ex && <p className="han mt-2 text-xl leading-relaxed">{ex.zh.replace(q.idiom.hanzi, '＿＿＿＿')}</p>}
        {q.kind === 'context' && ex?.vi && <p className="mt-1 text-sm text-muted">{ex.vi}</p>}
      </div>
      <ul className="flex flex-col gap-2.5">
        {q.options.map((o) => {
          const right = o.id === q.idiom.id
          const cls = !chosen ? 'border-line bg-card hover:bg-soft' : right ? 'border-ok bg-ok-soft' : chosen === o.id ? 'border-bad bg-bad-soft' : 'border-line bg-card opacity-60'
          return <li key={o.id}><button type="button" disabled={!!chosen} onClick={() => answer(o.id)} className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-semibold ${cls}`}>
            <span className={`min-w-0 flex-1 ${o.han ? 'han text-xl font-bold' : ''}`}>{o.text}</span>
            {chosen && right && <Check className="text-ok" size={20} />}{chosen === o.id && !right && <X className="text-bad" size={20} />}</button></li>
        })}
      </ul>
      {chosen && (
        <div className={`rounded-2xl p-4 ${chosen === q.idiom.id ? 'bg-ok-soft' : 'bg-bad-soft'}`} role="status">
          <p className="font-extrabold">{chosen === q.idiom.id ? tr("Chính xác!") : tr("Chưa đúng.")}</p>
          <p className="mt-1"><b className="han">{q.idiom.hanzi}</b> ({q.idiom.pinyin}): {q.idiom.meaningVi}</p>
          {q.idiom.figurative && <p className="mt-1 text-sm">{trx("Nghĩa bóng: {0}", [q.idiom.figurative])}</p>}
          {ex && <p className="han mt-1 text-sm">{ex.zh}</p>}
        </div>
      )}
      {chosen && <button type="button" className="btn-primary w-full" onClick={next}>{i + 1 < qs.length ? tr("Câu tiếp theo") : tr("Xem kết quả")}</button>}
    </div>
  )
}

/* ───────── Dạng 4: sắp xếp câu ───────── */
/* ───────── Dạng 4: đặt câu (có AI chấm và gợi ý) ───────── */
const CRIT: ['usage' | 'grammar' | 'context' | 'naturalness' | 'completeness', string][] = [
  ['usage', 'Dùng đúng Quán dụng ngữ'], ['grammar', 'Ngữ pháp'], ['context', 'Ngữ nghĩa và ngữ cảnh'], ['naturalness', 'Tính tự nhiên'], ['completeness', 'Mức độ hoàn thành'],
]
export const orderEligible = (i: Idiom) => !!orderPuzzle(i)

/* ───────── Dạng 4: Sắp xếp câu (chấm bằng đáp án lưu sẵn, không dùng AI) ───────── */
interface SortQ { idiom: Idiom; chunks: string[]; answers: string[]; ex: { zh: string; pinyin?: string; vi?: string }; bank: number[]; key: string }
function buildSort(items: Idiom[]): SortQ[] {
  return items.map((idiom) => {
    const p = orderPuzzle(idiom)!
    let bank = shuffle(p.chunks.map((_, k) => k))
    for (let t = 0; t < 6 && bank.every((v, k) => p.chunks[v] === p.chunks[k]); t++) bank = shuffle(bank) // không để thứ tự xáo trùng đáp án
    // Đáp án hợp lệ: câu gốc; có thể bổ sung phương án khác bằng trường `alt` của câu ví dụ trong dữ liệu.
    const alt = ((p.ex as { alt?: string[] }).alt ?? []).filter((x) => typeof x === 'string')
    return { idiom, chunks: p.chunks, answers: [p.ex.zh, ...alt], ex: p.ex, bank, key: `${idiom.id}|${p.ex.zh}` }
  })
}
export function SentenceGame({ items, onFinish }: ExProps) {
  const { t: tr } = useI18n()
  const ud = useUserData()
  const qs = useMemo(() => buildSort(items), [items])
  const [i, setI] = useState(0)
  const [placed, setPlaced] = useState<number[]>([])
  const [checked, setChecked] = useState<null | boolean>(null)
  const [hints, setHints] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0) // số câu đúng (độ chính xác)
  const [xpScore, setXpScore] = useState(0) // số câu đúng lần đầu, chỉ những câu này mới được cộng XP
  const [wrong, setWrong] = useState<string[]>([])
  const q = qs[i]
  const free = q.bank.filter((k) => !placed.includes(k))
  const sentence = placed.map((k) => q.chunks[k]).join('')
  const done = checked !== null || revealed

  const move = (pos: number, d: -1 | 1) => setPlaced((p) => { const n = [...p]; const j = pos + d; if (j < 0 || j >= n.length) return p; [n[pos], n[j]] = [n[j], n[pos]]; return n })
  const check = () => {
    if (placed.length !== q.chunks.length) return
    const ok = q.answers.includes(sentence)
    setChecked(ok)
    if (ok) {
      setScore((s) => s + 1); playCorrect()
      // XP chỉ cho lần đầu làm đúng một câu (không cộng lại khi làm lại cùng câu).
      if (!hints && ud.markSortDone(q.key)) setXpScore((s) => s + 1)
    } else setWrong((w) => (w.includes(q.idiom.id) ? w : [...w, q.idiom.id]))
  }
  const hint = () => {
    if (done) return
    setHints((h) => Math.min(3, h + 1))
    // Gợi ý 2 và 3: đặt sẵn một cụm đúng vào vị trí tiếp theo.
    if (hints >= 1) setPlaced((p) => {
      const ok = p.every((k, pos) => q.chunks[k] === q.chunks[pos])
      const base = ok ? p : []
      const next = q.bank.find((k) => !base.includes(k) && q.chunks[k] === q.chunks[base.length])
      return next === undefined ? base : [...base, next]
    })
  }
  const reset = () => { setPlaced([]); setChecked(null); setRevealed(false) }
  const reveal = () => {
    setRevealed(true); setChecked(false); setPlaced(q.chunks.map((_, k) => k))
    setWrong((w) => (w.includes(q.idiom.id) ? w : [...w, q.idiom.id]))
  }
  const next = () => {
    if (i + 1 < qs.length) { setI(i + 1); setPlaced([]); setChecked(null); setHints(0); setRevealed(false) }
    else onFinish(score, qs.length, wrong, xpScore)
  }
  const gotIt = checked === true

  return (
    <div className="flex flex-col gap-4">
      <p className="font-bold text-brand-strong">{tr('Câu {0}/{1}', [i + 1, qs.length])}</p>
      <div className="rounded-2xl bg-brand-soft p-4 text-center">
        <p className="font-bold text-brand-strong">{tr('Sắp xếp các cụm thành câu tiếng Trung đúng thứ tự')}</p>
        <p className="mt-2 text-sm">{tr('Câu có chứa Quán dụng ngữ')} <b className="han text-lg">{q.idiom.hanzi}</b></p>
        {hints >= 1 && <p className="mt-2 rounded-xl bg-card p-2 text-sm" aria-live="polite">{q.ex.vi ? tr('Gợi ý nghĩa: {0}', [q.ex.vi]) : tr('Gợi ý nghĩa: {0}', [q.idiom.meaningVi])}</p>}
      </div>

      <div aria-label={tr('Câu của bạn')} className={`min-h-[84px] rounded-2xl border-2 border-dashed p-3 ${gotIt ? 'border-ok bg-ok-soft' : checked === false ? 'border-bad bg-bad-soft' : 'border-line'}`}>
        {placed.length === 0 ? <p className="text-center text-muted">{tr('Chạm các cụm bên dưới để xếp vào đây')}</p> : (
          <ul className="flex flex-wrap gap-2">
            {placed.map((k, pos) => (
              <li key={k} className="flex items-center gap-0.5 rounded-xl border border-line bg-card pl-1">
                <button type="button" disabled={done || pos === 0} onClick={() => move(pos, -1)} aria-label={tr('Đưa sang trái')} className="h-9 w-7 text-muted disabled:opacity-30">‹</button>
                <button type="button" disabled={done} onClick={() => setPlaced((p) => p.filter((x) => x !== k))} aria-label={tr('Bỏ cụm {0}', [q.chunks[k]])} className="han min-h-[44px] px-1 text-xl font-bold">{q.chunks[k]}</button>
                <button type="button" disabled={done || pos === placed.length - 1} onClick={() => move(pos, 1)} aria-label={tr('Đưa sang phải')} className="h-9 w-7 text-muted disabled:opacity-30">›</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="flex min-h-[56px] flex-wrap gap-2" role="group" aria-label={tr('Các cụm cần sắp xếp')}>
        {free.map((k) => (
          <li key={k}><button type="button" disabled={done} onClick={() => setPlaced((p) => [...p, k])} className={`han chip !min-h-[48px] !px-4 !text-xl font-bold ${hints >= 2 && q.chunks[k] === q.chunks[placed.length] && !done ? '!border-brand ring-2 ring-brand/40' : ''}`}>{q.chunks[k]}</button></li>
        ))}
      </ul>

      {done && (
        <div className={`rounded-2xl p-4 ${gotIt ? 'bg-ok-soft' : 'bg-bad-soft'}`} role="status">
          <p className="font-extrabold">{gotIt ? tr('Chính xác!') : revealed ? tr('Đáp án') : tr('Chưa đúng. Hãy thử lại hoặc xem đáp án.')}</p>
          {(gotIt || revealed) && (
            <div className="mt-1 text-sm">
              <p className="han text-lg">{q.ex.zh}</p>
              {q.ex.pinyin && <p className="text-brand-strong">{q.ex.pinyin}</p>}
              {q.ex.vi && <p>{q.ex.vi}</p>}
              <p className="mt-1 text-muted"><b className="han">{q.idiom.hanzi}</b>: {q.idiom.meaningVi}</p>
              {gotIt && hints === 0 && !ud.state.claims['sort-done']?.includes(q.key) && null}
            </div>
          )}
        </div>
      )}

      {checked === false && !revealed ? (
        <div className="grid grid-cols-2 gap-2"><button type="button" className="btn-ghost" onClick={reset}>{tr('Làm lại')}</button><button type="button" className="btn-soft" onClick={reveal}>{tr('Xem đáp án')}</button></div>
      ) : !done ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary col-span-2" onClick={check} disabled={placed.length !== q.chunks.length}>{tr('Kiểm tra')}</button>
          <button type="button" className="btn-ghost" onClick={hint} disabled={hints >= 3}>{tr('Gợi ý')}{hints > 0 ? ` (${hints}/3)` : ''}</button>
          <button type="button" className="btn-ghost" onClick={reset} disabled={placed.length === 0}>{tr('Làm lại')}</button>
          <button type="button" className="btn-soft col-span-2" onClick={reveal}>{tr('Xem đáp án')}</button>
        </div>
      ) : null}
      {done && <button type="button" className="btn-primary w-full" onClick={next}>{i + 1 < qs.length ? tr('Câu tiếp theo') : tr('Xem kết quả')}</button>}
    </div>
  )
}

export const clozeEligible = (i: Idiom) => i.examples.some((e) => e.zh.includes(i.hanzi))
export function ClozeGame({ items, onFinish }: ExProps) {
  const { t: tr, tx: trx } = useI18n()
  const parts = useMemo(() => items.map((i) => {
    const ex = i.examples.find((e) => e.zh.includes(i.hanzi))!
    const at = ex.zh.indexOf(i.hanzi)
    return { idiom: i, before: ex.zh.slice(0, at), after: ex.zh.slice(at + i.hanzi.length), vi: ex.vi }
  }), [items])
  const bank = useMemo(() => shuffle(items), [items])
  const [fill, setFill] = useState<(string | null)[]>(() => items.map(() => null))
  const [active, setActive] = useState<number | null>(0)
  const [checked, setChecked] = useState(false)
  useEffect(() => { /* giữ active hợp lệ */ if (active !== null && fill[active] !== null) setActive(fill.findIndex((f) => f === null) === -1 ? null : fill.findIndex((f) => f === null)) }, [fill, active])
  const used = new Set(fill.filter(Boolean) as string[])
  const put = (id: string) => {
    if (checked || used.has(id)) return
    const slot = active ?? fill.findIndex((f) => f === null)
    if (slot < 0) return
    setFill((f) => f.map((v, k) => (k === slot ? id : v)))
  }
  const clear = (k: number) => { if (checked) return; setFill((f) => f.map((v, j) => (j === k ? null : v))); setActive(k) }
  const correct = fill.filter((f, k) => f === items[k].id).length
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{tr("Chọn một chỗ trống, rồi chạm Quán dụng ngữ phù hợp trong danh sách bên dưới.")}</p>
      <div className="card flex flex-col gap-3 p-4">
        {parts.map((p, k) => {
          const f = fill[k]
          const st = checked ? (f === p.idiom.id ? 'border-ok bg-ok-soft text-ok' : 'border-bad bg-bad-soft text-bad') : active === k ? 'border-brand bg-brand-soft' : 'border-dashed border-line'
          const chosen = f ? items.find((x) => x.id === f) : undefined
          return (
            <p key={p.idiom.id} className="han text-xl leading-[2.4rem]">
              <span className="mr-1 text-sm font-bold text-muted">{k + 1}.</span>{p.before}
              <button type="button" onClick={() => (f ? clear(k) : setActive(k))} className={`mx-1 inline-flex min-h-[40px] min-w-[5rem] items-center justify-center rounded-xl border-2 px-2 align-middle text-lg font-bold ${st}`} aria-label={tr("Chỗ trống {0}", [k + 1])}>
                {chosen ? chosen.hanzi : '＿＿'}
              </button>{p.after}
            </p>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={tr("Danh sách Quán dụng ngữ")}>
        {bank.map((b) => <button key={b.id} type="button" disabled={used.has(b.id) || checked} onClick={() => put(b.id)} className="han chip !min-h-[48px] !px-4 !text-lg font-bold disabled:opacity-40">{b.hanzi}</button>)}
      </div>
      {!checked ? (
        <button type="button" className="btn-primary w-full" disabled={fill.some((f) => f === null)} onClick={() => { setChecked(true); if (correct === items.length) playCorrect() }}>{tr("Kiểm tra đáp án")}</button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="rounded-2xl bg-brand-soft p-4 font-bold text-brand-strong" role="status">{trx("Đúng {0}/{1} chỗ trống.", [correct, items.length])}</p>
          <ul className="flex flex-col gap-2">
            {parts.map((p, k) => <li key={p.idiom.id} className={`rounded-2xl p-3 ${fill[k] === p.idiom.id ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
              <p className="han text-lg">{p.before}<b>{p.idiom.hanzi}</b>{p.after}</p>
              {p.vi && <p className="text-sm">{p.vi}</p>}
              <p className="mt-1 text-sm"><b>{tr("Cách dùng:")}</b> {p.idiom.meaningVi}{p.idiom.figurative ? `. ${p.idiom.figurative}` : ''}</p>
            </li>)}
          </ul>
          <button type="button" className="btn-primary w-full" onClick={() => onFinish(correct, items.length, items.filter((it, k) => fill[k] !== it.id).map((it) => it.id))}>{tr("Xem kết quả")}</button>
        </div>
      )}
    </div>
  )
}
