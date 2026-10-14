import { Link } from 'react-router-dom'
import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import { idiomSources, idiomTopics, type Idiom } from '../types'
import { VBADGE } from '../lib/verify'
import { AddButton, Illustration, SourceLine, SpeakButton, SpeakText, StatusBadge } from './ui'
import { useI18n } from '../i18n'

export function IdiomDetail({ idiom, showAdd = true, headerSize = 'text-5xl' }: { idiom: Idiom; showAdd?: boolean; headerSize?: string }) {
  const { t: tr, tx: trx } = useI18n()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`han font-bold leading-tight ${headerSize}`}>{idiom.hanzi}</p>
          <p className="mt-1 text-lg font-semibold text-brand-strong">{idiom.pinyin || tr("Chưa có pinyin")}</p>
          {idiom.autoFields?.includes('pinyin') && <p className="text-xs text-muted">{tr("Pinyin tạo tự động, chưa được kiểm duyệt")}</p>}
        </div>
        <div className="flex items-center gap-2">
          <SpeakButton idiom={idiom} />
          {showAdd && <AddButton idiomId={idiom.id} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="han rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-strong">惯用语</span>
        {idiom.custom ? <span className="rounded-full bg-warn-soft px-3 py-1 text-sm font-bold text-warn">{tr("Do bạn tự thêm")}</span> : <StatusBadge idiomId={idiom.id} />}
        {idiomTopics(idiom).map((t) => <Link key={t} to={`/hoc?xem=chude&chude=${encodeURIComponent(t)}`} className="chip chip-on">{tr(t)}</Link>)}
        {idiom.verification && <span className="rounded-full bg-soft px-3 py-1 text-sm font-bold text-muted">{tr(VBADGE[idiom.verification])}</span>}
      </div>

      <p className="text-xl font-extrabold leading-snug">{idiom.meaningVi}</p>

      {(idiom.literal || idiom.figurative) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {idiom.literal && <div className="rounded-2xl bg-soft p-4"><p className="text-sm font-bold text-muted">{tr("Nghĩa đen")}</p><p className="mt-1">{idiom.literal}</p></div>}
          {idiom.figurative && <div className="rounded-2xl bg-brand-soft p-4"><p className="text-sm font-bold text-brand-strong">{tr("Nghĩa bóng")}</p><p className="mt-1">{idiom.figurative}</p></div>}
        </div>
      )}

      <Illustration idiom={idiom} className="max-h-60" />
      {idiom.image && idiom.imageCredit && (
        <p className="-mt-2 text-xs text-muted">
          {trx("Ảnh: {0} {1}", [[idiom.imageCredit.author, idiom.imageCredit.license].filter(Boolean).join(' · ') || tr("chưa ghi nguồn"), idiom.imageCredit.sourceUrl && /^https?:\/\//i.test(idiom.imageCredit.sourceUrl) && <> · <a className="underline" href={idiom.imageCredit.sourceUrl} target="_blank" rel="noopener noreferrer">{tr("trang nguồn")}</a></>])}</p>
      )}

      {idiom.examples.length > 0 ? idiom.examples.map((ex, i) => (
        <div key={i} className="rounded-2xl border border-line p-4">
          <p className="text-sm font-bold text-muted">{trx("Câu ví dụ{0}", [idiom.examples.length > 1 ? ` ${i + 1}` : ''])}</p>
          <div className="mt-1 flex items-start gap-2"><p className="han min-w-0 flex-1 text-xl leading-relaxed">{ex.zh}</p><SpeakText text={ex.zh} size="sm" label={tr("Nghe câu ví dụ")} /></div>
          {ex.pinyin && <p className="mt-1 text-brand-strong">{ex.pinyin}</p>}
          {ex.vi && <p className="mt-1">{ex.vi}</p>}
          {ex.source && <div className="mt-2"><SourceLine label={tr("Nguồn câu ví dụ")} value={ex.source} /></div>}
        </div>
      )) : <p className="text-muted">{tr("Chưa có câu ví dụ trong dữ liệu.")}</p>}

      {idiom.occurrences && idiom.occurrences.length > 0 && (
        <details className="rounded-2xl border border-line p-4">
          <summary className="cursor-pointer font-bold">{trx("Xuất hiện trong đề ({0})", [idiom.occurrences.length])}</summary>
          <ul className="mt-3 flex flex-col gap-3">
            {idiom.occurrences.map((o, i) => (
              <li key={i} className="rounded-xl bg-soft p-3 text-sm">
                <p className="font-bold"><span className="han !break-all">{o.source}</span></p>
                <p className="text-muted">{[o.exam && tr("Đề: {0}", [o.exam]), o.question && tr("Câu: {0}", [o.question]), o.page && `Trang: ${o.page}`].filter(Boolean).join(' · ') || tr("Chưa có vị trí cụ thể")}</p>
                {o.quote && <p className="han mt-1 whitespace-pre-line text-base leading-relaxed">{o.quote}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col gap-1">
        <SourceLine label={idiomSources(idiom).length > 1 ? tr("Xuất hiện trong các sách") : tr("Nguồn Quán dụng ngữ")} value={idiom.custom ? tr("Người dùng tự nhập") : idiomSources(idiom).join(' · ') || undefined} />
        {idiom.examContext && <p className="text-sm text-muted"><b>{tr("Ngữ cảnh trong đề thi:")}{' '}</b>{idiom.examContext}</p>}
        {idiom.note && <p className="text-sm text-muted"><b>{idiom.custom ? tr("Nguồn bạn ghi: ") : tr("Ghi chú: ")}</b>{idiom.note}</p>}
      </div>
    </div>
  )
}

/** Thẻ lật: mặt trước chỉ có chữ Hán lớn, chạm để xem mặt sau. */
export function Flashcard({ idiom, onFlip }: { idiom: Idiom; onFlip?: () => void }) {
  const { t: tr } = useI18n()
  const [back, setBack] = useState(false)
  const flip = () => { setBack((b) => !b); if (!back) onFlip?.() }
  return (
    <div className="card overflow-hidden">
      {!back ? (
        <button type="button" onClick={flip} className="flex min-h-[300px] w-full flex-col items-center justify-center gap-6 px-4 py-10 text-center" aria-label={tr("Lật thẻ để xem nghĩa")}>
          <span className="han text-[clamp(3rem,16vw,5.5rem)] font-bold leading-tight">{idiom.hanzi}</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 font-bold text-brand-strong"><RotateCw size={18} />{tr("Chạm để xem nghĩa")}</span>
        </button>
      ) : (
        <div className="p-4 sm:p-6">
          <IdiomDetail idiom={idiom} />
          <button type="button" onClick={flip} className="btn-ghost mt-5 w-full"><RotateCw size={18} />{tr("Lật lại mặt trước")}</button>
        </div>
      )}
    </div>
  )
}
