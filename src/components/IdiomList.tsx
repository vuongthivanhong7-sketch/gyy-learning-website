import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { idiomTopics, type Idiom } from '../types'
import { AddButton, EmptyState, StatusBadge } from './ui'
import { useI18n } from '../i18n'

interface Props {
  idioms: Idiom[]
  /** Hiện thanh chủ đề để xem Quán dụng ngữ cùng nhóm. Chủ đề lấy từ dữ liệu thật. */
  showTopics?: boolean
  to?: (i: Idiom) => string
  emptyTitle?: string
  emptyText?: string
}

export function IdiomList({ idioms, showTopics = false, to = (i) => `/tu/${i.id}`, emptyTitle, emptyText }: Props) {
  const { t: tr, tx: trx } = useI18n()
  const [topic, setTopic] = useState<string | null>(null)
  const topics = useMemo(() => {
    const m = new Map<string, number>()
    idioms.forEach((i) => idiomTopics(i).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)))
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'))
  }, [idioms])
  const shown = topic ? idioms.filter((i) => idiomTopics(i).includes(topic)) : idioms

  return (
    <div className="flex flex-col gap-3">
      {showTopics && topics.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={tr("Lọc theo chủ đề")}>
          <button type="button" className={`chip ${topic === null ? 'chip-on' : ''}`} onClick={() => setTopic(null)}>{trx("Tất cả ({0})", [idioms.length])}</button>
          {topics.map(([t, n]) => (
            <button key={t} type="button" className={`chip ${topic === t ? 'chip-on' : ''}`} onClick={() => setTopic(t)} aria-pressed={topic === t}>{tr(t)} ({n})</button>
          ))}
        </div>
      )}
      {shown.length === 0 ? <EmptyState title={emptyTitle ?? tr("Chưa có Quán dụng ngữ")}>{emptyText}</EmptyState> : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((i) => (
            <li key={i.id} className="card flex items-center gap-2 p-3 sm:p-4">
              <Link to={to(i)} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <span className="han w-[5.5rem] shrink-0 text-xl font-bold leading-tight sm:w-32 sm:text-2xl">{i.hanzi}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-brand-strong">{i.pinyin}</span>
                  <span className="line-clamp-2 text-[15px] leading-snug">{i.meaningVi}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5"><StatusBadge idiomId={i.id} />{idiomTopics(i)[0] && <span className="text-xs text-muted">{idiomTopics(i).map((x) => tr(x)).join(' · ')}</span>}</span>
                </span>
              </Link>
              <AddButton idiomId={i.id} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Gợi ý Quán dụng ngữ cùng chủ đề với một mục. */
export function RelatedByTopic({ idiom, all }: { idiom: Idiom; all: Idiom[] }) {
  const { tx: trx } = useI18n()
  const mine = idiomTopics(idiom)
  if (mine.length === 0) return null
  const related = all.filter((i) => i.id !== idiom.id && idiomTopics(i).some((t) => mine.includes(t))).slice(0, 6)
  if (related.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold">{trx("Cùng chủ đề: {0}", [mine.join(', ')])}</h2>
      <IdiomList idioms={related} />
      <div className="flex flex-wrap gap-2">{mine.map((t) => <Link key={t} to={`/hoc?xem=chude&chude=${encodeURIComponent(t)}`} className="btn-soft">{trx("Xem cả nhóm “{0}”", [t])}</Link>)}</div>
    </section>
  )
}
