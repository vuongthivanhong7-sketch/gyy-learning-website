import { playCorrect, playComplete } from '../lib/sound'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Lightbulb, X } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { resolveIdiom, useUserData } from '../store/UserData'
import { useAuth } from '../store/AuthContext'
import { Flashcard } from '../components/Flashcard'
import { HanziPractice } from '../components/HanziPractice'
import { Steps } from '../components/Steps'
import { Back, EmptyState, SpeakButton } from '../components/ui'
import { matchesTyped } from '../lib/text'
import { pick, shuffle } from '../lib/random'
import { RATINGS, formatInterval, previewIntervalMin } from '../lib/srs'
import type { Idiom, Rating } from '../types'
import { useI18n } from '../i18n'

export default function Lesson() {
  const { t: tr } = useI18n()
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { idioms, status } = useIdioms()
  const ud = useUserData()
  const { backendConfigured, account, promptLogin } = useAuth()
  const idiom = resolveIdiom(idioms, ud.state.custom, id)
  const done0 = ud.progressOf(id)?.stepsDone ?? [false, false, false, false]
  const [step, setStep] = useState(() => { const f = done0.findIndex((d) => !d); return f === -1 ? 0 : f })
  const [local, setLocal] = useState<{ write?: boolean; type?: boolean; quiz?: boolean }>({})
  const [rated, setRated] = useState<Rating | null>(null)

  const finish = (i: number, result?: boolean) => {
    ud.markStep(id, i, result)
    if (i === 1) setLocal((l) => ({ ...l, write: result }))
    if (i === 2) setLocal((l) => ({ ...l, type: result }))
    if (i === 3) { setLocal((l) => ({ ...l, quiz: result })); ud.completeLesson(id); playComplete() }
    setStep(i + 1)
  }

  const nextIdiom = useMemo(() => {
    if (!idiom) return undefined
    const i = idioms.findIndex((x) => x.id === idiom.id)
    const order = [...idioms.slice(i + 1), ...idioms.slice(0, Math.max(i, 0))]
    return order.find((x) => !ud.isLearned(x.id)) ?? order[0]
  }, [idioms, idiom, ud])

  if (status === 'loading') return <p className="text-muted">{tr("Đang tải…")}</p>
  if (!idiom) return <EmptyState title={tr("Không tìm thấy Quán dụng ngữ")} action={<Link to="/hoc" className="btn-primary">{tr("Về danh sách học")}</Link>}>{tr("Mục này có thể đã bị xóa hoặc dữ liệu đã thay đổi.")}</EmptyState>

  const doneForBar = step >= 4 ? [true, true, true, true] : done0.map((d, i) => d || i < step)
  const needLogin = backendConfigured && !account

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <Back to="/hoc">{tr("Danh sách học")}</Back>
      {needLogin && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          <span>{tr("Bạn chưa đăng nhập: tiến độ bài này sẽ không được lưu.")}</span>
          <button type="button" className="btn-soft !min-h-[40px] !px-4 !text-sm" onClick={() => promptLogin(tr("Đăng nhập để lưu tiến độ học."))}>{tr("Đăng nhập")}</button>
        </div>
      )}
      <div className="card px-3 pb-4 pt-2 sm:px-5">
        <Steps current={step >= 4 ? -1 : step} done={doneForBar} onGo={(i) => setStep(i)} />
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <Flashcard idiom={idiom} />
          <button type="button" className="btn-primary w-full" onClick={() => finish(0)}>{tr("Đã xem xong, sang bước viết chữ")}</button>
        </div>
      )}
      {step === 1 && (
        <div className="card p-4 sm:p-6">
          <h2 className="mb-1 text-center text-xl font-extrabold">{tr("Viết chữ Hán")}</h2>
          <p className="mb-4 text-center text-muted">{idiom.meaningVi}</p>
          <HanziPractice hanzi={idiom.hanzi} onDone={(ok) => finish(1, ok)} />
        </div>
      )}
      {step === 2 && <TypeStep idiom={idiom} onDone={(ok) => finish(2, ok)} />}
      {step === 3 && <QuizStep idiom={idiom} pool={idioms} onDone={(ok) => finish(3, ok)} />}
      {step >= 4 && (
        <div className="card flex flex-col gap-5 p-4 sm:p-6">
          <div className="text-center">
            <p className="text-sm font-bold text-ok">{tr("Hoàn thành 4 bước")}</p>
            <p className="han mt-1 text-4xl font-bold">{idiom.hanzi}</p>
            <p className="mt-1 text-brand-strong">{idiom.pinyin}</p>
            <p className="mt-2 text-lg font-bold">{idiom.meaningVi}</p>
          </div>
          <ul className="grid gap-2 text-sm font-bold sm:grid-cols-2">
            <ResultRow label="Flashcard" ok />
            <ResultRow label={tr("Viết chữ")} ok={local.write ?? ud.progressOf(id)?.stepResults.write} />
            <ResultRow label={tr("Gõ từ")} ok={local.type ?? ud.progressOf(id)?.stepResults.type} />
            <ResultRow label={tr("Trắc nghiệm")} ok={local.quiz ?? ud.progressOf(id)?.stepResults.quiz} />
          </ul>
          {idiom.examples[0] && (
            <div className="rounded-2xl border border-line p-4">
              <p className="han text-lg">{idiom.examples[0].zh}</p>
              {idiom.examples[0].vi && <p className="mt-1 text-muted">{idiom.examples[0].vi}</p>}
            </div>
          )}
          <div>
            <p className="mb-2 font-extrabold">{tr("Bạn nhớ Quán dụng ngữ này đến mức nào?")}</p>
            <div className="grid grid-cols-2 gap-2">
              {RATINGS.map((r) => (
                <button key={r.key} type="button" disabled={!!rated} onClick={() => { ud.rateIdiom(id, r.key); setRated(r.key) }}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 font-extrabold transition ${rated === r.key ? 'border-brand bg-brand-soft' : 'border-line bg-card hover:bg-soft'} disabled:opacity-60`}>
                  {tr(r.label)}
                  <span className="text-xs font-semibold text-muted">~{formatInterval(previewIntervalMin(ud.progressOf(id)?.srs, r.key), tr)}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">
              {rated ? tr("Đã lưu lịch ôn tập.") : tr("Bạn có thể bỏ qua và đánh giá sau. “Đã học xong 4 bước” khác với “đã nhớ tốt”.")}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-ghost" onClick={() => { setStep(0); setRated(null) }}>{tr("Học lại mục này")}</button>
            {nextIdiom && <button type="button" className="btn-primary" onClick={() => { nav(`/hoc/${nextIdiom.id}`); setStep(0); setRated(null) }}>{tr("Quán dụng ngữ tiếp theo")}</button>}
          </div>
        </div>
      )}
    </div>
  )
}

function ResultRow({ label, ok }: { label: string; ok?: boolean }) {
  const { t: tr } = useI18n()
  return (
    <li className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${ok ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
      {ok ? <Check size={18} /> : <X size={18} />}{label}: {ok ? tr("đạt") : tr("chưa đạt")}
    </li>
  )
}

function TypeStep({ idiom, onDone }: { idiom: Idiom; onDone: (ok: boolean) => void }) {
  const { t: tr, tx: trx } = useI18n()
  const [val, setVal] = useState('')
  const [hints, setHints] = useState(0)
  const [state, setState] = useState<'idle' | 'right' | 'wrong' | 'revealed'>('idle')
  const [tries, setTries] = useState(0)
  const firstSyllable = idiom.pinyin.split(/\s+/)[0]
  const check = () => {
    if (!val.trim()) return
    if (matchesTyped(val, idiom.hanzi, idiom.pinyin)) { setState('right'); playCorrect() }
    else { setState('wrong'); setTries((t) => t + 1) }
  }
  const finished = state === 'right' || state === 'revealed'
  return (
    <div className="card flex flex-col gap-4 p-4 sm:p-6">
      <h2 className="text-center text-xl font-extrabold">{tr("Gõ Quán dụng ngữ")}</h2>
      <div className="rounded-2xl bg-brand-soft p-4 text-center">
        <p className="text-sm font-bold text-brand-strong">{tr("Nghĩa tiếng Việt")}</p>
        <p className="mt-1 text-xl font-extrabold">{idiom.meaningVi}</p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="font-bold">{tr("Gõ chữ Hán hoặc pinyin (không cần dấu thanh)")}</span>
        <input className="input han" value={val} onChange={(e) => { setVal(e.target.value); if (state === 'wrong') setState('idle') }} disabled={finished} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          placeholder={tr("Ví dụ: chi bu xiao")} onKeyDown={(e) => e.key === 'Enter' && check()} />
      </label>
      {hints > 0 && (
        <div className="rounded-2xl bg-warn-soft p-3 text-warn" aria-live="polite">
          <p className="flex items-center gap-2 font-bold"><Lightbulb size={18} />{tr("Gợi ý")}</p>
          <p>{trx("Gồm {0} chữ Hán.{1}", [Array.from(idiom.hanzi).length, hints > 1 && <> {' '}{tr("Âm tiết đầu:")}{' '}<b>{firstSyllable}</b></>])}</p>
        </div>
      )}
      {state === 'wrong' && <p className="font-bold text-bad" role="alert">{tr("Chưa đúng. Thử lại nhé.")}</p>}
      {state === 'right' && <p className="font-bold text-ok" role="status">{trx("Chính xác! {0} ({1})", [idiom.hanzi, idiom.pinyin])}</p>}
      {state === 'revealed' && <p className="font-bold text-warn" role="status">{tr("Đáp án:")}{' '}<span className="han">{idiom.hanzi}</span> ({idiom.pinyin})</p>}
      <div className="flex flex-wrap items-center gap-2"><SpeakButton idiom={idiom} /></div>
      {!finished ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary col-span-2" onClick={check} disabled={!val.trim()}>{tr("Kiểm tra")}</button>
          <button type="button" className="btn-ghost" onClick={() => setHints((h) => Math.min(2, h + 1))} disabled={hints >= 2}>{tr("Xem gợi ý")}</button>
          <button type="button" className="btn-ghost" onClick={() => setState('revealed')} disabled={tries < 1}>{tr("Xem đáp án")}</button>
        </div>
      ) : (
        <button type="button" className="btn-primary w-full" onClick={() => onDone(state === 'right')}>{tr("Sang bước trắc nghiệm")}</button>
      )}
    </div>
  )
}

function QuizStep({ idiom, pool, onDone }: { idiom: Idiom; pool: Idiom[]; onDone: (ok: boolean) => void }) {
  const { t: tr, tx: trx } = useI18n()
  const options = useMemo(() => {
    const wrong = pick(pool.filter((p) => p.id !== idiom.id && p.meaningVi !== idiom.meaningVi), 3)
    return shuffle([{ id: idiom.id, text: idiom.meaningVi }, ...wrong.map((w) => ({ id: w.id, text: w.meaningVi }))])
  }, [idiom, pool])
  const [chosen, setChosen] = useState<string | null>(null)
  const right = chosen === idiom.id
  return (
    <div className="card flex flex-col gap-4 p-4 sm:p-6">
      <h2 className="text-center text-xl font-extrabold">{tr("Chọn nghĩa đúng nhất")}</h2>
      <div className="rounded-2xl bg-brand-soft p-4 text-center">
        <p className="han text-4xl font-bold">{idiom.hanzi}</p>
        <p className="mt-1 text-brand-strong">{idiom.pinyin}</p>
        <div className="mt-2 flex justify-center"><SpeakButton idiom={idiom} /></div>
      </div>
      {options.length < 2 && <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">{tr("Kho dữ liệu chưa đủ Quán dụng ngữ để tạo đáp án nhiễu. Cần ít nhất 4 mục.")}</p>}
      <ul className="flex flex-col gap-2.5">
        {options.map((o) => {
          const isRight = o.id === idiom.id
          const cls = chosen === null ? 'border-line bg-card hover:bg-soft' : isRight ? 'border-ok bg-ok-soft' : chosen === o.id ? 'border-bad bg-bad-soft' : 'border-line bg-card opacity-60'
          return (
            <li key={o.id}>
              <button type="button" disabled={chosen !== null} onClick={() => { setChosen(o.id); if (o.id === idiom.id) playCorrect() }} className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base font-semibold transition ${cls}`}>
                <span className="min-w-0 flex-1">{o.text}</span>
                {chosen !== null && isRight && <Check className="shrink-0 text-ok" size={22} />}
                {chosen === o.id && !isRight && <X className="shrink-0 text-bad" size={22} />}
              </button>
            </li>
          )
        })}
      </ul>
      {chosen !== null && (
        <div className={`rounded-2xl p-4 ${right ? 'bg-ok-soft' : 'bg-bad-soft'}`} role="status">
          <p className="font-extrabold">{right ? tr("Chính xác!") : tr("Chưa đúng.")}</p>
          {idiom.figurative && <p className="mt-1">{trx("Nghĩa bóng: {0}", [idiom.figurative])}</p>}
          {idiom.literal && <p className="mt-1 text-muted">{trx("Nghĩa đen: {0}", [idiom.literal])}</p>}
        </div>
      )}
      {chosen !== null && <button type="button" className="btn-primary w-full" onClick={() => onDone(right)}>{tr("Hoàn thành bài học")}</button>}
    </div>
  )
}
