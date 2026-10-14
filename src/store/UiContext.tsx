import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface Ctx { goalsOpen: boolean; openGoals: () => void; closeGoals: () => void }
const C = createContext<Ctx | null>(null)
export function UiProvider({ children }: { children: ReactNode }) {
  const [goalsOpen, setGoalsOpen] = useState(false)
  const value = useMemo<Ctx>(() => ({ goalsOpen, openGoals: () => setGoalsOpen(true), closeGoals: () => setGoalsOpen(false) }), [goalsOpen])
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useUi = () => { const v = useContext(C); if (!v) throw new Error('UiProvider missing'); return v }
