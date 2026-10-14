import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { emptyUserState, newProgress, type SentenceRecord, type Activity, type CustomIdiom, type ExerciseRun, type Idiom, type Prefs, type Progress, type Rating, type UserState } from '../types'
import { useAuth } from './AuthContext'
import { createLocalRepo, createSupabaseRepo, type Repo } from './repo'
import { createFirestoreRepo } from './firestoreRepo'
import { firebaseConfigured } from '../lib/firebase'
import { newSrs, rate } from '../lib/srs'
import { activityDays, computeStreak, shiftDay, vnDay, weekStart } from '../lib/date'
import { uid } from '../lib/random'

export const POINTS = { learn: 10, review: 3, exerciseCorrect: 2 }

interface Ctx {
  state: UserState
  loading: boolean
  /** false = đang ở chế độ có backend nhưng chưa đăng nhập: không lưu được dữ liệu cá nhân. */
  canPersist: boolean
  syncError?: string
  progressOf: (id: string) => Progress | undefined
  isSaved: (id: string) => boolean
  /** Thêm vào sổ tay (idempotent, không tạo bản ghi trùng). Trả về false nếu cần đăng nhập. */
  save: (idiomId: string) => boolean
  unsave: (idiomId: string) => void
  setNote: (idiomId: string, note: string) => void
  markStep: (idiomId: string, step: number, result?: boolean) => void
  completeLesson: (idiomId: string) => void
  rateIdiom: (idiomId: string, rating: Rating, opts?: { review?: boolean }) => void
  addCustom: (c: Omit<CustomIdiom, 'id' | 'custom' | 'createdAt' | 'examples'> & { example?: CustomIdiom['examples'][number]; personalNote?: string }) => boolean
  updateCustom: (c: CustomIdiom) => void
  deleteCustom: (id: string) => void
  recordRun: (r: Omit<ExerciseRun, 'id' | 'ts'> & { xpCorrect?: number }) => boolean
  /** Đánh dấu một câu "Sắp xếp câu" đã được cộng XP. Trả về true nếu đây là lần đầu (được cộng XP), false nếu đã cộng trước đó. */
  markSortDone: (key: string) => boolean
  setPrefs: (p: Partial<Prefs>) => void
  /** Lưu câu đã viết và phản hồi (chỉ sau khi người học nộp bài). */
  saveSentence: (r: Omit<SentenceRecord, 'id' | 'ts'>) => void
  /** Nhận XP của nhiệm vụ hôm nay. Chỉ nhận được một lần cho mỗi nhiệm vụ mỗi ngày. */
  claimTask: (taskId: string, xp: number, today?: string) => boolean
  isLearned: (id: string) => boolean
  dueIds: string[]
  stats: {
    learned: number; reviewing: number; due: number; runs: number; accuracy: number | null
    streak: { current: number; longest: number }; weekPoints: number; totalPoints: number; studiedToday: boolean; learningCount: number
  }
}
const C = createContext<Ctx | null>(null)

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { account, backendConfigured, loading: authLoading, promptLogin } = useAuth()
  const [state, setState] = useState<UserState>(emptyUserState())
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState<string>()
  const stateRef = useRef(state)
  stateRef.current = state

  const userId = account?.id
  const repo: Repo | null = useMemo(() => {
    if (!backendConfigured) return createLocalRepo()
    if (!userId) return null
    return firebaseConfigured ? createFirestoreRepo(userId) : createSupabaseRepo(userId)
  }, [backendConfigured, userId])
  const canPersist = !!repo

  // Nạp dữ liệu khi đổi tài khoản; xóa sạch dữ liệu của tài khoản trước.
  useEffect(() => {
    setState(emptyUserState())
    setSyncError(undefined)
    if (authLoading) return
    if (!repo) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    repo.load().then((s) => { if (!cancelled) setState(s) }).catch((e: Error) => { if (!cancelled) setSyncError(e.message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [repo, authLoading])

  const run = useCallback((p: Promise<void>) => { p.catch((e: Error) => setSyncError(e.message)) }, [])

  const requireAuth = useCallback((reason: string) => {
    if (repo) return true
    promptLogin(reason)
    return false
  }, [repo, promptLogin])

  const putProgress = useCallback((p: Progress) => {
    if (!repo) return // chưa đăng nhập (chế độ có backend): không lưu dữ liệu cá nhân
    setState((s) => ({ ...s, progress: { ...s.progress, [p.idiomId]: p } }))
    run(repo.saveProgress(p))
  }, [repo, run])

  const getP = (id: string) => stateRef.current.progress[id] ?? newProgress(id)

  const logActivity = useCallback((a: Activity) => {
    if (!repo) return
    setState((s) => ({ ...s, activity: [...s.activity, a] }))
    run(repo.addActivity(a))
  }, [repo, run])

  const api = useMemo<Ctx>(() => {
    const now = () => new Date()
    const progressList = Object.values(state.progress)
    const dueIds = progressList.filter((p) => p.srs && new Date(p.srs.dueAt) <= now()).map((p) => p.idiomId)
    const days = activityDays(state.activity.filter((a) => a.kind !== 'bonus'))
    const wk = weekStart()
    const weekPoints = state.activity.filter((a) => vnDay(a.ts) >= wk).reduce((n, a) => n + a.points, 0)
    const answered = state.runs.reduce((n, r) => n + r.total, 0)
    const right = state.runs.reduce((n, r) => n + r.correct, 0)
    return {
      state, loading, canPersist, syncError,
      progressOf: (id) => state.progress[id],
      isSaved: (id) => !!state.progress[id]?.saved,
      isLearned: (id) => !!state.progress[id]?.learnedAt,
      save: (id) => {
        if (!requireAuth('Đăng nhập để lưu Quán dụng ngữ vào Sổ tay của bạn.')) return false
        const p = getP(id)
        if (p.saved) return true
        putProgress({ ...p, saved: true, savedAt: now().toISOString(), srs: p.srs ?? newSrs(now()) })
        return true
      },
      unsave: (id) => {
        const p = state.progress[id]
        if (!p) return
        // Giữ lại tiến độ học; chỉ bỏ khỏi sổ tay.
        putProgress({ ...p, saved: false, savedAt: undefined })
      },
      setNote: (id, note) => putProgress({ ...getP(id), note }),
      markStep: (id, step, result) => {
        if (!repo) return
        const p = getP(id)
        const stepsDone = [...p.stepsDone]; stepsDone[step] = true
        const key = (['', 'write', 'type', 'quiz'] as const)[step]
        putProgress({ ...p, stepsDone, lastStudiedAt: now().toISOString(), stepResults: key && result !== undefined ? { ...p.stepResults, [key]: result } : p.stepResults })
      },
      completeLesson: (id) => {
        const p = getP(id)
        if (p.learnedAt) return
        putProgress({ ...p, learnedAt: now().toISOString(), lastStudiedAt: now().toISOString() })
        logActivity({ ts: now().toISOString(), kind: 'learn', points: POINTS.learn, idiomId: id })
      },
      rateIdiom: (id, rating, opts) => {
        if (!requireAuth('Đăng nhập để lưu lịch ôn tập.')) return
        const p = getP(id)
        putProgress({ ...p, srs: rate(p.srs, rating, now()) })
        if (opts?.review) logActivity({ ts: now().toISOString(), kind: 'review', points: rating === 'again' ? 0 : POINTS.review, idiomId: id, correct: rating !== 'again' })
      },
      addCustom: (c) => {
        if (!requireAuth('Đăng nhập để thêm Quán dụng ngữ của riêng bạn.')) return false
        const { example, personalNote, ...rest } = c
        const item: CustomIdiom = { ...rest, id: `custom-${uid()}`, custom: true, createdAt: now().toISOString(), examples: example ? [example] : [] }
        setState((s) => ({ ...s, custom: [item, ...s.custom] }))
        if (repo) run(repo.saveCustom(item))
        putProgress({ ...newProgress(item.id), saved: true, savedAt: now().toISOString(), srs: newSrs(now()), ...(personalNote ? { note: personalNote } : {}) })
        return true
      },
      updateCustom: (c) => {
        setState((s) => ({ ...s, custom: s.custom.map((x) => (x.id === c.id ? c : x)) }))
        if (repo) run(repo.saveCustom(c))
      },
      deleteCustom: (id) => {
        setState((s) => { const progress = { ...s.progress }; delete progress[id]; return { ...s, custom: s.custom.filter((x) => x.id !== id), progress } })
        if (repo) { run(repo.deleteCustom(id)); run(repo.deleteProgress(id)) }
      },
      saveSentence: (r) => {
        if (!repo) return
        const rec: SentenceRecord = { ...r, id: uid(), ts: new Date().toISOString() }
        const sentences = [rec, ...stateRef.current.sentences].slice(0, 60)
        stateRef.current = { ...stateRef.current, sentences }
        setState((s) => ({ ...s, sentences }))
        run(repo.saveSentences(sentences))
      },
      setPrefs: (patch) => {
        const prefs = { ...stateRef.current.prefs, ...patch }
        setState((s) => ({ ...s, prefs }))
        if (repo) run(repo.savePrefs(prefs))
      },
      claimTask: (taskId, xp, today = vnDay()) => {
        const cur = stateRef.current.claims
        if ((cur[today] ?? []).includes(taskId) || !repo) return false
        // Chỉ giữ lịch sử nhận thưởng 14 ngày gần nhất.
        const keep = Object.fromEntries(Object.entries(cur).filter(([d]) => d === 'sort-done' || d >= shiftDay(today, -14)))
        const claims = { ...keep, [today]: [...(cur[today] ?? []), taskId] }
        stateRef.current = { ...stateRef.current, claims }
        setState((s) => ({ ...s, claims }))
        run(repo.saveClaims(claims))
        logActivity({ ts: new Date().toISOString(), kind: 'bonus', points: Math.min(30, xp), ref: `${today}-${taskId}` })
        return true
      },
      markSortDone: (key) => {
        const cur = stateRef.current.claims
        if (!repo || (cur['sort-done'] ?? []).includes(key)) return false
        const claims = { ...cur, 'sort-done': [...(cur['sort-done'] ?? []), key] }
        stateRef.current = { ...stateRef.current, claims }
        setState((s) => ({ ...s, claims }))
        run(repo.saveClaims(claims))
        return true
      },
      recordRun: (r) => {
        if (!requireAuth('Đăng nhập để lưu lịch sử luyện tập.')) return false
        const { xpCorrect: _xp, ...runData } = r
        const full: ExerciseRun = { ...runData, id: uid(), ts: now().toISOString() }
        setState((s) => ({ ...s, runs: [full, ...s.runs] }))
        if (repo) run(repo.addRun(full))
        // Mỗi phiên luyện tập là một hoạt động hợp lệ (tính streak) dù điểm có thể bằng 0; tối đa 30 XP mỗi phiên.
        logActivity({ ts: full.ts, kind: 'exercise', points: Math.min(30, (r.xpCorrect ?? r.correct) * POINTS.exerciseCorrect) })
        return true
      },
      dueIds,
      stats: {
        learned: progressList.filter((p) => p.learnedAt).length,
        reviewing: progressList.filter((p) => p.srs && (p.learnedAt || p.saved)).length,
        due: dueIds.length,
        runs: state.runs.length,
        accuracy: answered ? Math.round((right / answered) * 100) : null,
        streak: computeStreak(days),
        weekPoints,
        totalPoints: state.activity.reduce((n, a) => n + a.points, 0),
        studiedToday: days.has(vnDay()),
        learningCount: progressList.filter((p) => !p.learnedAt && p.stepsDone?.some(Boolean)).length,
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, loading, canPersist, syncError, repo, requireAuth, putProgress, logActivity, run])

  return <C.Provider value={api}>{children}</C.Provider>
}

export const useUserData = () => {
  const v = useContext(C)
  if (!v) throw new Error('UserDataProvider missing')
  return v
}

/** Gộp ngữ liệu chung + Quán dụng ngữ tự thêm của người dùng. */
export const resolveIdiom = (all: Idiom[], custom: CustomIdiom[], id: string): Idiom | undefined =>
  all.find((i) => i.id === id) ?? custom.find((i) => i.id === id)
