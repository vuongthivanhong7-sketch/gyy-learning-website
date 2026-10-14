import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { VerifyEntry, VerifyFile, SourceRef } from '../lib/verify'
import { termKey } from '../lib/verify'
import { uid } from '../lib/random'
import { compile, dictResults, type Compiled, type DictIndex } from '../lib/dictindex'

export interface LookupRecord { term: string; state: string; ts: string }
export interface Suggestion { id: string; term: string; meaning?: string; note?: string; state: string; createdAt: string }

const LS = { entries: 'gyy:verify:local:v1', history: 'gyy:lookups:v1', sugg: 'gyy:suggestions:v1' }
const read = <T,>(k: string, d: T): T => { try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : d } catch { return d } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* bỏ qua */ } }

interface Ctx {
  sources: SourceRef[]
  fileUpdatedAt: string | null
  /** Hồ sơ kiểm chứng đi kèm trang (file) + bản nháp quản trị trên máy này. */
  entries: VerifyEntry[]
  localEntries: VerifyEntry[]
  find: (term: string) => VerifyEntry | undefined
  /** Kết hợp hồ sơ nhập thủ công và kết quả đối chiếu chỉ mục từ điển (OCR). Thủ công ưu tiên theo từng nguồn. */
  lookup: (term: string) => VerifyEntry | undefined
  dictStatus: 'loading' | 'ready' | 'none'
  dictInfo?: { generatedAt: string; entries: number; pages: DictIndex['pages'] }
  saveEntry: (e: VerifyEntry) => void
  deleteEntry: (term: string) => void
  replaceLocal: (e: VerifyEntry[]) => void
  history: LookupRecord[]
  addHistory: (r: Omit<LookupRecord, 'ts'>) => void
  clearHistory: () => void
  suggestions: Suggestion[]
  addSuggestion: (s: Omit<Suggestion, 'id' | 'createdAt'>) => void
  deleteSuggestion: (id: string) => void
}
const C = createContext<Ctx | null>(null)
const DEFAULT_SOURCES: SourceRef[] = []

export function VerifyProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<VerifyFile>({ updatedAt: null, sources: DEFAULT_SOURCES, entries: [] })
  const [local, setLocal] = useState<VerifyEntry[]>(() => read(LS.entries, []))
  const [history, setHistory] = useState<LookupRecord[]>(() => read(LS.history, []))
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => read(LS.sugg, []))
  const [dict, setDict] = useState<{ index: DictIndex; compiled: Compiled } | null>(null)
  const [dictStatus, setDictStatus] = useState<'loading' | 'ready' | 'none'>('loading')

  useEffect(() => {
    const src: Promise<DictIndex> = __SINGLE__
      ? import('../data/inlineData').then((m) => m.dictIndexFile as unknown as DictIndex)
      : fetch(`${import.meta.env.BASE_URL}data/dict-index.json`).then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? (r.json() as Promise<DictIndex>) : Promise.reject(new Error('x'))))
    src.then((index) => { if (index.entries?.length) { setDict({ index, compiled: compile(index) }); setDictStatus('ready') } else setDictStatus('none') }).catch(() => setDictStatus('none'))
  }, [])

  useEffect(() => {
    const src: Promise<VerifyFile> = __SINGLE__
      ? import('../data/inlineData').then((m) => m.verificationsFile as unknown as VerifyFile)
      : fetch(`${import.meta.env.BASE_URL}data/verifications.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? (r.json() as Promise<VerifyFile>) : Promise.reject(new Error('x'))))
    src.then((f) => setFile({ updatedAt: f.updatedAt ?? null, sources: f.sources ?? [], entries: f.entries ?? [] })).catch(() => { /* không có file: giữ danh sách rỗng */ })
  }, [])

  const entries = useMemo(() => {
    const m = new Map<string, VerifyEntry>()
    for (const e of file.entries) m.set(termKey(e.term), e)
    for (const e of local) m.set(termKey(e.term), e)
    return [...m.values()]
  }, [file, local])

  const persistLocal = useCallback((fn: (c: VerifyEntry[]) => VerifyEntry[]) => setLocal((c) => { const n = fn(c); write(LS.entries, n); return n }), [])
  const value = useMemo<Ctx>(() => ({
    sources: file.sources, fileUpdatedAt: file.updatedAt, entries, localEntries: local,
    find: (t) => entries.find((e) => termKey(e.term) === termKey(t)),
    lookup: (t) => {
      const manual = entries.find((e) => termKey(e.term) === termKey(t))
      const auto = dict ? dictResults(dict.index, dict.compiled, t) : []
      if (!manual && auto.length === 0) return undefined
      const manualIds = new Set((manual?.results ?? []).map((r) => r.sourceId))
      return { ...(manual ?? { term: termKey(t) }), term: termKey(t), results: [...(manual?.results ?? []), ...auto.filter((r) => !manualIds.has(r.sourceId))] }
    },
    dictStatus, dictInfo: dict ? { generatedAt: dict.index.generatedAt, entries: dict.index.entries.length, pages: dict.index.pages } : undefined,
    saveEntry: (e) => persistLocal((c) => [{ ...e, updatedAt: new Date().toISOString() }, ...c.filter((x) => termKey(x.term) !== termKey(e.term))]),
    deleteEntry: (t) => persistLocal((c) => c.filter((x) => termKey(x.term) !== termKey(t))),
    replaceLocal: (e) => persistLocal(() => e),
    history,
    addHistory: (r) => setHistory((h) => { const n = [{ ...r, ts: new Date().toISOString() }, ...h.filter((x) => termKey(x.term) !== termKey(r.term))].slice(0, 30); write(LS.history, n); return n }),
    clearHistory: () => { setHistory([]); write(LS.history, []) },
    suggestions,
    addSuggestion: (s) => setSuggestions((c) => { const n = [{ ...s, id: uid(), createdAt: new Date().toISOString() }, ...c]; write(LS.sugg, n); return n }),
    deleteSuggestion: (id) => setSuggestions((c) => { const n = c.filter((x) => x.id !== id); write(LS.sugg, n); return n }),
  }), [file, entries, local, history, suggestions, persistLocal, dict, dictStatus])
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useVerify = () => { const v = useContext(C); if (!v) throw new Error('VerifyProvider missing'); return v }
