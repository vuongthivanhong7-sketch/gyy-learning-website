import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { useUserData } from '../store/UserData'
import { IdiomList } from '../components/IdiomList'
import { Page } from '../components/Layout'
import { DemoBanner } from '../components/ui'
import LookupGeneral from './LookupGeneral'
import { isHan, normalizePinyin, normalizeVi } from '../lib/text'
import { idiomSources, type Idiom } from '../types'
import { useI18n } from '../i18n'

export { matchIdiom } from '../lib/search'
import { matchIdiom } from '../lib/search'

function ByDoc() {
  const { t: tr, tx: trx } = useI18n()
  const { idioms, isDemo, topics, sources } = useIdioms()
  const ud = useUserData()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [focus, setFocus] = useState(false)
  const topic = params.get('chude') ?? ''
  const source = params.get('nguon') ?? ''
  const status = params.get('tt') ?? ''
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }) }

  const results = useMemo(() => idioms.filter((i) =>
    matchIdiom(i, q)
    && (!topic || i.topic === topic)
    && (!source || idiomSources(i).includes(source))
    && (!status || (status === 'learned' ? ud.isLearned(i.id) : status === 'unlearned' ? !ud.isLearned(i.id) : ud.isSaved(i.id))),
  ), [idioms, q, topic, source, status, ud])
  const suggestions = q.trim() ? idioms.filter((i) => matchIdiom(i, q)).slice(0, 5) : []

  return (
    <>
      {isDemo && <DemoBanner />}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={22} />
        <input className="input han !pl-12" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder={tr("Ví dụ: 吃醋, chi cu, ghen tuông")} aria-label={tr("Từ khóa tra cứu")} autoCapitalize="none" spellCheck={false} />
        {focus && suggestions.length > 0 && q.trim() && (
          <ul className="card absolute inset-x-0 top-full z-20 mt-1 overflow-hidden" role="listbox" aria-label={tr("Gợi ý")}>
            {suggestions.map((s) => (
              <li key={s.id}><button type="button" className="flex min-h-[48px] w-full items-baseline gap-3 px-4 py-2 text-left hover:bg-soft" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(s.hanzi); setFocus(false) }}>
                <b className="han text-lg">{s.hanzi}</b><span className="min-w-0 truncate text-sm text-muted">{s.pinyin} · {s.meaningVi}</span></button></li>
            ))}
          </ul>
        )}
      </div>
      <div className={`grid gap-2 ${topics.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {topics.length > 0 && <select className="input !min-h-[48px] !text-base" value={topic} onChange={(e) => set('chude', e.target.value)} aria-label={tr("Lọc theo chủ đề")}><option value="">{tr("Mọi chủ đề")}</option>{topics.map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select>}
        <select className="input !min-h-[48px] !text-base" value={source} onChange={(e) => set('nguon', e.target.value)} aria-label={tr("Lọc theo nguồn")} disabled={sources.length === 0}><option value="">{sources.length ? tr("Mọi nguồn sách") : tr("Chưa có dữ liệu nguồn")}</option>{sources.map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select>
        <select className="input !min-h-[48px] !text-base" value={status} onChange={(e) => set('tt', e.target.value)} aria-label={tr("Lọc theo trạng thái")}><option value="">{tr("Mọi trạng thái")}</option><option value="learned">{tr("Đã học")}</option><option value="unlearned">{tr("Chưa học")}</option><option value="saved">{tr("Đã lưu trong sổ tay")}</option></select>
      </div>
      <p className="text-sm font-bold text-muted" aria-live="polite">{trx("{0} kết quả", [results.length])}</p>
      <IdiomList idioms={results} emptyTitle={tr("Không tìm thấy kết quả")} emptyText={tr("Thử bỏ dấu, gõ pinyin ngắn hơn, hoặc xóa bớt bộ lọc.")} />
    </>
  )
}

export default function Lookup() {
  const { t: tr } = useI18n()
  const [params, setParams] = useSearchParams()
  const mode = params.get('che-do') === 'chung' ? 'chung' : 'tai-lieu'
  const go = (m: string) => { const n = new URLSearchParams(params); m === 'chung' ? n.set('che-do', 'chung') : n.delete('che-do'); setParams(n, { replace: true }) }
  return (
    <Page title={tr("Tra cứu Quán dụng ngữ")} subtitle={mode === 'chung' ? tr("Nhập bất kỳ từ hoặc cụm từ tiếng Trung để xem nó đã được xác minh là Quán dụng ngữ hay chưa.") : tr("Tìm trong kho Quán dụng ngữ của GYY bằng chữ Hán, pinyin (có hoặc không có dấu thanh) hoặc nghĩa tiếng Việt.")}>
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-soft p-1.5 sm:max-w-xl" role="tablist" aria-label={tr("Chế độ tra cứu")}>
        {([['tai-lieu', tr("Tra cứu theo tài liệu")], ['chung', tr("Tra cứu chung")]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => go(k)} className={`min-h-[52px] rounded-xl px-2 text-[15px] font-extrabold leading-tight transition sm:text-base ${mode === k ? 'bg-card text-brand-strong shadow-card' : 'text-muted hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      {mode === 'chung' ? <LookupGeneral /> : <ByDoc />}
    </Page>
  )
}
