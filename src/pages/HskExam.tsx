import { useMemo, useState } from 'react'
import { useIdioms } from '../data/IdiomsContext'
import { useUserData } from '../store/UserData'
import { Page } from '../components/Layout'
import { DemoBanner, EmptyState } from '../components/ui'
import { ChoiceGame } from './exercises'
import { pick } from '../lib/random'
import { idiomSources, type Idiom } from '../types'
import { useI18n } from '../i18n'

export default function HskExam() {
  const { t: tr, tx: trx } = useI18n()
  const { idioms, isDemo, sources } = useIdioms()
  const ud = useUserData()
  const [run, setRun] = useState<{ source: string; items: Idiom[]; key: number } | null>(null)
  const [result, setResult] = useState<string>()
  const counts = useMemo(() => sources.map((s) => ({ s, items: idioms.filter((i) => idiomSources(i).includes(s)) })), [idioms, sources])

  if (run) return (
    <Page title={tr("Luyện đề theo nguồn")} subtitle={run.source} actions={<button className="btn-ghost !min-h-[44px]" onClick={() => setRun(null)}>{tr("Thoát")}</button>}>
      <div className="mx-auto w-full max-w-2xl"><ChoiceGame key={run.key} items={run.items} pool={idioms} onFinish={(c, t) => { ud.recordRun({ type: 'choice', total: t, correct: c, topic: run.source, idiomIds: run.items.map((i) => i.id) }); setResult(`${c}/${t}`); setRun(null) }} /></div>
    </Page>
  )
  return (
    <Page title={tr("Luyện thi HSK 5")} subtitle={tr("Làm trắc nghiệm Quán dụng ngữ theo từng sách hoặc tài liệu nguồn trong dữ liệu.")}>
      {isDemo && <DemoBanner />}
      {result && <p className="rounded-2xl bg-ok-soft p-4 font-bold text-ok" role="status">{trx("Kết quả lần vừa rồi: {0}", [result])}</p>}
      {counts.length === 0 ? (
        <EmptyState title={tr("Chưa có dữ liệu nguồn sách")}>{tr("Khi file Google Sheets có cột tên sách hoặc tài liệu nguồn, các bộ đề theo nguồn sẽ xuất hiện ở đây. Trong lúc đó bạn có thể luyện ở mục Luyện tập.")}</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">{counts.map(({ s, items }) => (
          <li key={s} className="card flex flex-col gap-3 p-4">
            <span className="han !break-all text-lg font-extrabold leading-snug">{s}</span>
            <span className="text-muted">{trx("{0} Quán dụng ngữ", [items.length])}</span>
            <button className="btn-primary" disabled={items.length < 1 || idioms.length < 4} onClick={() => setRun({ source: s, items: pick(items, Math.min(10, items.length)), key: Date.now() })}>{tr("Làm trắc nghiệm")}</button>
          </li>))}</ul>
      )}
    </Page>
  )
}
