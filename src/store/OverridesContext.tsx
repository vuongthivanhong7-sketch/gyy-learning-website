import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { emptyOverrides, normalizeOverrides, type Overrides } from '../lib/overrides'
import { kvGet, kvSet } from '../lib/idb'

interface Ctx {
  /** Bản nháp quản trị lưu trên trình duyệt này. */
  local: Overrides
  ready: boolean
  update: (fn: (o: Overrides) => Overrides) => void
  replace: (o: Overrides) => void
  reset: () => void
  saveError?: string
  isAdmin: boolean
  setAdmin: (v: boolean) => void
}
const C = createContext<Ctx | null>(null)
const KEY = 'overrides'

export function OverridesProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<Overrides>(emptyOverrides())
  const [ready, setReady] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const [isAdmin, setIsAdmin] = useState(() => { try { return localStorage.getItem('gyy:admin') === '1' } catch { return false } })

  useEffect(() => { void kvGet<Overrides>(KEY).then((o) => { setLocal(normalizeOverrides(o)); setReady(true) }) }, [])

  const persist = useCallback((o: Overrides) => {
    setLocal(o)
    void kvSet(KEY, o).then((ok) => setSaveError(ok ? undefined : 'Không lưu được vào trình duyệt (bộ nhớ đầy hoặc bị chặn).'))
  }, [])
  const update = useCallback((fn: (o: Overrides) => Overrides) => setLocal((cur) => { const n = fn(cur); void kvSet(KEY, n).then((ok) => setSaveError(ok ? undefined : 'Không lưu được vào trình duyệt (bộ nhớ đầy hoặc bị chặn).')); return n }), [])
  const setAdmin = useCallback((v: boolean) => { setIsAdmin(v); try { localStorage.setItem('gyy:admin', v ? '1' : '0') } catch { /* bỏ qua */ } }, [])

  const value = useMemo<Ctx>(() => ({ local, ready, update, replace: persist, reset: () => persist(emptyOverrides()), saveError, isAdmin, setAdmin }), [local, ready, update, persist, saveError, isAdmin, setAdmin])
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useOverrides = () => { const v = useContext(C); if (!v) throw new Error('OverridesProvider missing'); return v }
