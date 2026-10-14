import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, BookOpen, NotebookPen, Search, X } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { useUserData } from '../store/UserData'
import { AddButton, DemoBanner, EmptyState, Illustration, SpeakButton, StatusBadge } from '../components/ui'
import { ProgressChart } from '../components/ProgressChart'
import { StatsGrid } from '../components/StatsGrid'
import { Heatmap } from '../components/Heatmap'
import Notebook from './Notebook'
import { matchIdiom } from './Lookup'
import { isDueProgress, learnStatus } from '../lib/status'
import { idiomSources, idiomTopics, type Idiom } from '../types'
import { TITLES } from './Practice'
import { useI18n } from '../i18n'

export type Tab = 'hoc' | 'tien-do' | 'cua-toi'
const TABS: { key: Tab; label: string; to: string; icon: typeof BookOpen }[] = [
  { key: 'hoc', label: 'Học', to: '/hoc', icon: BookOpen },
  { key: 'tien-do', label: 'Tiến độ', to: '/hoc/tien-do', icon: BarChart3 },
  { key: 'cua-toi', label: 'Từ vựng của tôi', to: '/so-tay', icon: NotebookPen },
]

export default function LearnModule({ tab }: { tab: Tab }) {
  const { t: tr } = useI18n()
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.7rem,6vw,2.6rem)] font-extrabold leading-[1.15]">{tr("Học")}{' '}<span className="text-brand-strong">{tr("Quán dụng ngữ HSK 5")}</span> {' '}{tr("mỗi ngày")}</h1>
        <p className="max-w-prose text-lg text-muted">{tr("Chọn chủ đề phù hợp, học Quán dụng ngữ và ôn tập theo phương pháp lặp lại ngắt quãng.")}</p>
      </header>
      <nav aria-label={tr("Các phần của module học")} className="grid grid-cols-3 gap-2 rounded-2xl bg-soft p-1.5" role="tablist">
        {TABS.map((t) => (
          <Link key={t.key} to={t.to} role="tab" aria-selected={tab === t.key} aria-current={tab === t.key ? 'page' : undefined}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center text-[13px] font-extrabold leading-tight transition sm:flex-row sm:gap-2 sm:text-base ${tab === t.key ? 'bg-card text-brand-strong shadow-card' : 'text-muted hover:text-ink'}`}>
            <t.icon size={20} className="shrink-0" /><span>{tr(t.label)}</span>
          </Link>
        ))}
      </nav>
      {tab === 'hoc' && <LearnTab />}
      {tab === 'tien-do' && <ProgressTab />}
      {tab === 'cua-toi' && <Notebook embedded />}
    </div>
  )
}

type St = '' | 'new' | 'learning' | 'learned' | 'due' | 'saved'
const ST_LABEL: [St, string][] = [['', 'Tất cả'], ['new', 'Chưa học'], ['learning', 'Đang học'], ['learned', 'Đã học'], ['due', 'Đến hạn ôn tập'], ['saved', 'Đã lưu vào Từ vựng của tôi']]

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-sm font-bold text-muted">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group" aria-label={label}>{children}</div>
    </div>
  )
}

function LearnTab() {
  const { t: tr, tx: trx } = useI18n()
  const { idioms, isDemo, topics, sources, status, overrides } = useIdioms()
  const ud = useUserData()
  const [params, setParams] = useSearchParams()
  const [limit, setLimit] = useState(24)
  const view = params.get('xem') === 'chude' ? 'chude' : 'nguon'
  const topic = params.get('chude') ?? ''
  const source = params.get('nguon') ?? ''
  const st = (params.get('tt') ?? '') as St
  const q = params.get('q') ?? ''
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }); setLimit(24) }

  // Hai cách xem độc lập: theo nguồn sách HOẶC theo chủ đề (chủ đề tổng hợp từ toàn bộ kho, mọi sách).
  const base = useMemo(() => idioms.filter((i) => (view === 'nguon' ? !source || idiomSources(i).includes(source) : !topic || idiomTopics(i).includes(topic)) && matchIdiom(i, q)), [idioms, view, topic, source, q])
  const topicCount = useMemo(() => { const m = new Map<string, number>(); idioms.forEach((i) => idiomTopics(i).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1))); return m }, [idioms])
  const inStatus = (i: Idiom, s: St) => {
    const p = ud.progressOf(i.id)
    return s === '' || (s === 'due' ? isDueProgress(p) : s === 'saved' ? !!p?.saved : learnStatus(p) === s)
  }
  const counts = useMemo(() => Object.fromEntries(ST_LABEL.map(([k]) => [k, base.filter((i) => inStatus(i, k)).length])) as Record<St, number>, [base, ud]) // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => base.filter((i) => inStatus(i, st)), [base, st, ud]) // eslint-disable-line react-hooks/exhaustive-deps
  const practiceQs = new URLSearchParams({ 'pham-vi': 'all', ...(view === 'chude' && topic && { chude: topic }), ...(view === 'nguon' && source && { nguon: source }) }).toString()
  const chip = (on: boolean) => `chip shrink-0 !min-h-[44px] !px-4 !text-[15px] ${on ? 'chip-on' : ''}`

  return (
    <div className="flex flex-col gap-4">
      {isDemo && <DemoBanner />}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-bold text-muted">{tr("Xem danh sách theo")}</p>
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-soft p-1.5 sm:max-w-md" role="group" aria-label={tr("Cách phân loại")}>
          {([['nguon', tr("Nguồn sách")], ['chude', tr("Chủ đề")]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => set('xem', k === 'nguon' ? '' : k)} className={`min-h-[46px] rounded-xl px-3 text-base font-extrabold transition ${view === k ? 'bg-card text-brand-strong shadow-card' : 'text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
      </div>
      {view === 'chude' && (topics.length > 0 ? (
        <ChipRow label={tr("Chủ đề (tổng hợp từ tất cả các sách)")}>
          <button type="button" className={chip(topic === '')} aria-pressed={topic === ''} onClick={() => set('chude', '')}>{trx("Tất cả chủ đề ({0})", [idioms.length])}</button>
          {topics.map((t) => <button key={t} type="button" className={chip(topic === t)} aria-pressed={topic === t} onClick={() => set('chude', topic === t ? '' : t)}>{tr(t)} ({topicCount.get(t) ?? 0})</button>)}
        </ChipRow>
      ) : (
        <div className="card flex flex-col gap-2 p-4">
          <p className="font-extrabold">{tr("Kho dữ liệu chưa có thông tin chủ đề")}</p>
          <p className="text-muted">{tr("GYY không tự gán chủ đề. Hãy thêm cột “Chủ đề” vào file Google Sheets (có thể ghi nhiều chủ đề, ngăn cách bằng dấu chấm phẩy) rồi nạp lại, hoặc dùng trang Quản trị để tạo danh mục chủ đề và gán cho từng Quán dụng ngữ.")}</p>
          <Link to="/quan-tri" className="btn-soft self-start">{tr("Mở trang Quản trị chủ đề")}</Link>
        </div>
      ))}
      {view === 'chude' && topics.length > 0 && overrides.topicsNote && <p className="rounded-2xl bg-soft p-3 text-sm text-muted">{overrides.topicsNote}</p>}
      {view === 'nguon' && sources.length > 0 && (
        <ChipRow label={tr("Nguồn sách")}>
          <button type="button" className={chip(source === '')} aria-pressed={source === ''} onClick={() => set('nguon', '')}>{tr("Tất cả sách")}</button>
          {sources.map((t) => <button key={t} type="button" className={`${chip(source === t)} han max-w-[18rem]`} aria-pressed={source === t} onClick={() => set('nguon', source === t ? '' : t)}><span className="truncate">{t}</span></button>)}
        </ChipRow>
      )}
      <ChipRow label={tr("Trạng thái học tập")}>
        {ST_LABEL.map(([k, l]) => <button key={k} type="button" className={chip(st === k)} aria-pressed={st === k} onClick={() => set('tt', k)}>{l} ({counts[k]})</button>)}
      </ChipRow>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={22} />
          <input className="input han !pl-12 !pr-12" value={q} onChange={(e) => set('q', e.target.value)} placeholder={tr("Tìm chữ Hán, pinyin hoặc nghĩa tiếng Việt")} aria-label={tr("Tìm Quán dụng ngữ")} autoCapitalize="none" spellCheck={false} />
          {q && <button type="button" onClick={() => set('q', '')} aria-label={tr("Xóa từ khóa")} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-soft"><X size={20} /></button>}
        </div>
        <Link to={`/luyen-tap?${practiceQs}`} className="btn bg-[#c2410c] text-white hover:brightness-110 sm:shrink-0">{tr("Luyện tập tổng hợp")}</Link>
      </div>

      <p className="text-sm font-bold text-muted" aria-live="polite">{trx("Danh sách Quán dụng ngữ: {0} mục", [list.length])}</p>
      {status === 'loading' ? <p className="text-muted">{tr("Đang tải kho Quán dụng ngữ…")}</p> : list.length === 0 ? (
        <EmptyState title={tr("Không có Quán dụng ngữ phù hợp")} action={(topic || source || st || q) ? <button type="button" className="btn-primary" onClick={() => { setParams({}, { replace: true }) }}>{tr("Xóa tất cả bộ lọc")}</button> : undefined}>
          {idioms.length === 0 ? tr("Kho dữ liệu đang trống. Hãy nạp file ngữ liệu.") : st === 'learned' ? tr("Bạn chưa hoàn thành bài học nào. Một mục chỉ được tính là “đã học” khi xong đủ bốn bước.") : st === 'due' ? tr("Chưa có mục nào đến hạn ôn tập.") : tr("Thử bỏ dấu, rút ngắn từ khóa hoặc xóa bớt bộ lọc.")}
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {list.slice(0, limit).map((i) => {
              const learned = learnStatus(ud.progressOf(i.id)) === 'learned'
              return (
                <li key={i.id} className="card flex min-w-0 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="han text-2xl font-bold leading-tight [overflow-wrap:anywhere] min-[400px]:text-3xl">{i.hanzi}</p><p className="font-semibold text-brand-strong">{i.pinyin}</p></div>
                    <div className="flex shrink-0 items-center gap-1.5"><SpeakButton idiom={i} /><AddButton idiomId={i.id} compact /></div>
                  </div>
                  <p className="line-clamp-3 text-[15px] leading-snug">{i.meaningVi}</p>
                  {i.image && <Illustration idiom={i} className="max-h-40" />}
                  <StatusBadge idiomId={i.id} />
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Link to={`/hoc/${i.id}`} className="btn-primary !min-h-[46px]">{learned ? tr("Học lại") : tr("Học")}</Link>
                    <Link to={`/tu/${i.id}`} className="btn-ghost !min-h-[46px]">{tr("Xem chi tiết")}</Link>
                  </div>
                </li>
              )
            })}
          </ul>
          {list.length > limit && <button type="button" className="btn-ghost self-center" onClick={() => setLimit((n) => n + 24)}>{trx("Xem thêm ({0} mục)", [list.length - limit])}</button>}
        </>
      )}
    </div>
  )
}

function ProgressTab() {
  const { t: tr } = useI18n()
  const { state, stats } = useUserData()
  const [params] = useSearchParams()
  const muc = params.get('muc')
  useEffect(() => { if (muc) { const t = setTimeout(() => document.getElementById(muc)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); return () => clearTimeout(t) } }, [muc])
  const nothing = stats.learned === 0 && state.runs.length === 0 && state.activity.length === 0
  const runs = state.runs.slice(0, 8)
  return (
    <div className="flex flex-col gap-5">
      {nothing && (
        <EmptyState title={tr("Bạn chưa có hoạt động học nào")} action={<Link to="/hoc" className="btn-primary">{tr("Bắt đầu học")}</Link>}>{tr("Hoàn thành một bài học bốn bước hoặc một bài luyện tập để thống kê và biểu đồ bắt đầu có dữ liệu. Chúng tôi không tạo số liệu giả.")}</EmptyState>
      )}
      <h2 className="text-xl font-extrabold">{tr("Tiến độ học Quán dụng ngữ")}</h2>
      <StatsGrid />
      <Heatmap />
      <ProgressChart />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">{tr("Lịch sử luyện tập")}</h2>
        {runs.length === 0 ? <p className="text-muted">{tr("Chưa có bài luyện tập nào.")}</p> : (
          <ul className="flex flex-col gap-2">{runs.map((r) => (
            <li key={r.id} className="card flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0"><span className="block font-bold">{tr(TITLES[r.type])}</span><span className="text-sm text-muted">{new Date(r.ts).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}{r.topic ? ` · ${r.topic}` : ''}</span></span>
              <span className="shrink-0 text-lg font-extrabold text-brand-strong">{r.correct}/{r.total}</span>
            </li>))}</ul>
        )}
      </section>
    </div>
  )
}
