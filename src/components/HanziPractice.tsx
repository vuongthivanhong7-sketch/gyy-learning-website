import { playCorrect } from '../lib/sound'
import { useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import { hanChars } from '../lib/text'
import { strokeLoader } from '../lib/strokes'
import { useI18n } from '../i18n'

/** Luyện viết từng chữ Hán bằng hanzi-writer (có thứ tự nét và kiểm tra nét thật). */
export function HanziPractice({ hanzi, onDone }: { hanzi: string; onDone: (completedAll: boolean) => void }) {
  const { t: tr, tx: trx } = useI18n()
  const chars = hanChars(hanzi)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'animating' | 'quiz' | 'done'>('idle')
  const [mistakes, setMistakes] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [skipped, setSkipped] = useState(false)
  const [msg, setMsg] = useState(tr("Bấm “Xem thứ tự nét” để xem mẫu, rồi “Bắt đầu viết”."))
  const host = useRef<HTMLDivElement>(null)
  const writer = useRef<HanziWriter | null>(null)
  const char = chars[idx]

  useEffect(() => {
    const el = host.current
    if (!el || !char) return
    el.innerHTML = ''
    setLoadState('loading'); setPhase('idle'); setMistakes(0)
    setMsg(tr("Bấm “Xem thứ tự nét” để xem mẫu, rồi “Bắt đầu viết”."))
    const size = Math.max(200, Math.min(300, el.clientWidth || 300))
    writer.current = HanziWriter.create(el, char, {
      width: size, height: size, padding: 14, showOutline: true, showCharacter: false,
      strokeAnimationSpeed: 1, delayBetweenStrokes: 250,
      strokeColor: '#2F6199', outlineColor: '#C9D9EE', drawingColor: '#3B76B8',
      charDataLoader: strokeLoader,
      onLoadCharDataSuccess: () => setLoadState('ok'),
      onLoadCharDataError: () => setLoadState('error'),
    })
    return () => { writer.current?.cancelQuiz(); writer.current = null; el.innerHTML = '' }
  }, [char, idx])

  const animate = () => {
    const w = writer.current; if (!w) return
    w.cancelQuiz(); w.hideCharacter()
    setPhase('animating'); setMsg(tr("Xem kỹ thứ tự và hướng của từng nét."))
    void w.animateCharacter({ onComplete: () => { setPhase('idle'); setMsg(tr("Đã xem xong. Bấm “Bắt đầu viết” rồi vẽ từng nét bằng ngón tay hoặc chuột.")) } })
  }
  const start = () => {
    const w = writer.current; if (!w) return
    w.cancelQuiz(); w.hideCharacter()
    setMistakes(0); setPhase('quiz'); setMsg(tr("Vẽ nét đầu tiên. Sai nét sẽ có phản hồi, nét đúng sẽ được giữ lại."))
    void w.quiz({
      leniency: 1.2, showHintAfterMisses: 2,
      onCorrectStroke: (d) => setMsg(d.strokesRemaining > 0 ? tr("Đúng rồi! Còn {0} nét.", [d.strokesRemaining]) : tr("Nét cuối!")),
      onMistake: (d) => { setMistakes((m) => m + 1); setMsg(tr("Chưa đúng nét {0}. Thử lại theo thứ tự và hướng nét.", [d.strokeNum + 1])) },
      onComplete: (d) => { playCorrect(); setPhase('done'); setMistakes(d.totalMistakes); setMsg(d.totalMistakes === 0 ? tr("Chính xác hoàn toàn!") : tr("Hoàn thành với {0} lần sai nét. Viết lại để nhớ chắc hơn.", [d.totalMistakes])) },
    })
  }
  const next = () => {
    if (idx + 1 < chars.length) setIdx(idx + 1)
    else onDone(!skipped)
  }
  const skipNoData = () => { setSkipped(true); next() }

  if (chars.length === 0) return <p className="text-muted">{tr("Mục này không có chữ Hán để luyện viết.")}</p>

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center font-bold">{trx("Chữ thứ {0}/{1}:", [idx + 1, chars.length])}{' '}<span className="han text-2xl">{char}</span></p>
      <div className="flex w-full max-w-[320px] justify-center rounded-2xl border-2 border-dashed border-line bg-white p-1 touch-none">
        <div ref={host} className="w-full" style={{ minHeight: 200 }} aria-label={tr("Khung viết chữ {0}", [char])} />
      </div>

      {loadState === 'error' ? (
        <div className="w-full rounded-2xl bg-warn-soft p-4 text-warn" role="alert">
          <p className="font-bold">{trx("Không tải được dữ liệu thứ tự nét cho chữ “{0}”.", [char])}</p>
          <p className="mt-1 text-sm">{tr("Có thể do mất mạng hoặc chữ này chưa có dữ liệu. Bạn hãy tự viết chữ này ra giấy vài lần theo mặt trước thẻ, rồi bấm bên dưới. Mục này sẽ được ghi là “chưa kiểm tra nét”.")}</p>
          <button type="button" className="btn-primary mt-3 w-full" onClick={skipNoData}>{tr("Đã tự luyện, sang bước tiếp")}</button>
        </div>
      ) : (
        <>
          <p className={`min-h-[3rem] text-center font-semibold ${phase === 'done' && mistakes === 0 ? 'text-ok' : mistakes > 0 && phase === 'quiz' ? 'text-bad' : 'text-muted'}`} aria-live="polite">{msg}</p>
          <div className="grid w-full grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={animate} disabled={loadState !== 'ok' || phase === 'animating'}>{tr("Xem thứ tự nét")}</button>
            <button type="button" className="btn-primary" onClick={start} disabled={loadState !== 'ok' || phase === 'animating'}>{phase === 'done' ? tr("Viết lại") : phase === 'quiz' ? tr("Viết lại từ đầu") : tr("Bắt đầu viết")}</button>
          </div>
          <button type="button" className="btn-soft w-full" onClick={next} disabled={phase !== 'done'}>
            {idx + 1 < chars.length ? tr("Chữ tiếp theo") : tr("Hoàn thành bước viết chữ")}
          </button>
        </>
      )}
    </div>
  )
}
