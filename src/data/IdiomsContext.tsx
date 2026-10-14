import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { idiomSources, idiomTopics, type Idiom } from '../types'
import { allTopics, applyOverrides, emptyOverrides, mergeOverrides, normalizeOverrides, type Overrides } from '../lib/overrides'
import { useOverrides } from '../store/OverridesContext'
import { DEMO_IDIOMS } from './demo'

type Status = 'loading' | 'ready' | 'error'
interface Ctx {
  idioms: Idiom[]
  /** true = đang dùng dữ liệu minh họa vì chưa có public/data/idioms.json */
  isDemo: boolean
  status: Status
  error?: string
  updatedAt?: string
  refresh: () => void
  /** Danh mục chủ đề trên toàn kho (mọi nguồn sách). */
  topics: string[]
  /** Ghi đè (chủ đề, hình) đang áp dụng: bản đi kèm trang + bản nháp quản trị. */
  overrides: Overrides
  sources: string[]
}
const C = createContext<Ctx | null>(null)

const unique = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'vi'))

export function IdiomsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ idioms: Idiom[]; isDemo: boolean; status: Status; error?: string; updatedAt?: string }>({
    idioms: [], isDemo: false, status: 'loading',
  })
  const [fileOv, setFileOv] = useState<Overrides>(emptyOverrides())
  const { local } = useOverrides()
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading' }))
    const ovSource: Promise<Partial<Overrides>> = __SINGLE__
      ? import('./inlineData').then((m) => m.overridesFile as Partial<Overrides>)
      : fetch(`${import.meta.env.BASE_URL}data/overrides.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? (r.json() as Promise<Partial<Overrides>>) : {})).catch(() => ({}))
    void ovSource.then((o) => { if (!cancelled) setFileOv(normalizeOverrides(o)) })
    const source: Promise<{ idioms?: Idiom[]; updatedAt?: string }> = __SINGLE__
      ? import('./inlineData').then((m) => m.idiomsFile as { idioms?: Idiom[]; updatedAt?: string })
      : fetch(`${import.meta.env.BASE_URL}data/idioms.json?t=${Date.now()}`, { cache: 'no-store' }).then(async (r) => {
          const ct = r.headers.get('content-type') ?? ''
          if (!r.ok || !ct.includes('json')) throw new Error('missing')
          return r.json() as Promise<{ idioms?: Idiom[]; updatedAt?: string }>
        })
    source
      .then((j) => {
        if (cancelled) return
        const list = (j.idioms ?? []).filter((x) => x.id && x.hanzi && x.meaningVi)
        if (list.length === 0) setState({ idioms: DEMO_IDIOMS, isDemo: true, status: 'ready' })
        else setState({ idioms: list, isDemo: false, status: 'ready', updatedAt: j.updatedAt })
      })
      .catch(() => {
        if (!cancelled) setState({ idioms: DEMO_IDIOMS, isDemo: true, status: 'ready' })
      })
    return () => { cancelled = true }
  }, [tick])

  const overrides = useMemo(() => mergeOverrides(fileOv, local), [fileOv, local])
  const value = useMemo<Ctx>(() => {
    const idioms = applyOverrides(state.idioms, overrides)
    return { ...state, idioms, refresh, overrides, topics: allTopics(idioms, overrides), sources: unique(idioms.flatMap(idiomSources)) }
  }, [state, refresh, overrides])
  return <C.Provider value={value}>{children}</C.Provider>
}

export const useIdioms = () => {
  const v = useContext(C)
  if (!v) throw new Error('IdiomsProvider missing')
  return v
}
