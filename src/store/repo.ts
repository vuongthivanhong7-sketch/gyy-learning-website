import type { Activity, CustomIdiom, ExerciseRun, Prefs, Progress, SentenceRecord, UserState } from '../types'
import { emptyUserState } from '../types'
import { supabase } from '../lib/supabase'

/** Lớp lưu trữ dữ liệu cá nhân. Có 2 cách: trên thiết bị (thử nghiệm) hoặc Supabase (thật, theo từng tài khoản). */
export interface Repo {
  load(): Promise<UserState>
  saveProgress(p: Progress): Promise<void>
  deleteProgress(idiomId: string): Promise<void>
  saveCustom(c: CustomIdiom): Promise<void>
  deleteCustom(id: string): Promise<void>
  addActivity(a: Activity): Promise<void>
  addRun(r: ExerciseRun): Promise<void>
  savePrefs(p: Prefs): Promise<void>
  saveClaims(c: Record<string, string[]>): Promise<void>
  saveSentences(s: SentenceRecord[]): Promise<void>
}

const KEY = 'gyy:local:v1'

export function createLocalRepo(): Repo {
  const read = (): UserState => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<UserState>
      return { ...emptyUserState(), ...raw, prefs: { ...emptyUserState().prefs, ...(raw.prefs ?? {}) }, claims: raw.claims ?? {}, sentences: raw.sentences ?? [] }
    } catch { return emptyUserState() }
  }
  const write = (s: UserState) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* đầy bộ nhớ */ } }
  const mutate = async (fn: (s: UserState) => void) => { const s = read(); fn(s); write(s) }
  return {
    load: async () => read(),
    saveProgress: (p) => mutate((s) => { s.progress[p.idiomId] = p }),
    deleteProgress: (id) => mutate((s) => { delete s.progress[id] }),
    saveCustom: (c) => mutate((s) => { s.custom = [c, ...s.custom.filter((x) => x.id !== c.id)] }),
    deleteCustom: (id) => mutate((s) => { s.custom = s.custom.filter((x) => x.id !== id) }),
    addActivity: (a) => mutate((s) => { s.activity.push(a) }),
    addRun: (r) => mutate((s) => { s.runs.unshift(r) }),
    savePrefs: (p) => mutate((s) => { s.prefs = p }),
    saveClaims: (c) => mutate((s) => { s.claims = c }),
    saveSentences: (x) => mutate((s) => { s.sentences = x }),
  }
}

function fail(error: { message: string } | null) { if (error) throw new Error(error.message) }

export function createSupabaseRepo(userId: string): Repo {
  const db = supabase!
  return {
    async load() {
      const [p, c, a, r] = await Promise.all([
        db.from('progress').select('idiom_id,data').eq('user_id', userId),
        db.from('custom_idioms').select('data').eq('user_id', userId),
        db.from('activity').select('ts,kind,points,correct,idiom_id').eq('user_id', userId).order('ts', { ascending: true }).limit(20000),
        db.from('exercise_runs').select('id,ts,type,total,correct,topic,idiom_ids').eq('user_id', userId).order('ts', { ascending: false }).limit(500),
      ])
      fail(p.error); fail(c.error); fail(a.error); fail(r.error)
      const s = emptyUserState()
      for (const row of p.data ?? []) {
        // Mục tiêu và nhận thưởng nhiệm vụ được lưu trong bảng progress với mã đặc biệt (không cần thêm bảng).
        if (row.idiom_id === '__prefs__') s.prefs = { ...s.prefs, ...(row.data as Prefs) }
        else if (row.idiom_id === '__claims__') s.claims = row.data as Record<string, string[]>
        else if (row.idiom_id === '__sentences__') s.sentences = (row.data as SentenceRecord[]) ?? []
        else s.progress[row.idiom_id as string] = row.data as Progress
      }
      s.custom = (c.data ?? []).map((x) => x.data as CustomIdiom)
      s.activity = (a.data ?? []).map((x) => ({ ts: x.ts, kind: x.kind, points: x.points, correct: x.correct ?? undefined, idiomId: x.idiom_id ?? undefined }))
      s.runs = (r.data ?? []).map((x) => ({ id: x.id, ts: x.ts, type: x.type, total: x.total, correct: x.correct, topic: x.topic ?? undefined, idiomIds: x.idiom_ids ?? [] }))
      return s
    },
    async saveProgress(p) {
      fail((await db.from('progress').upsert({ user_id: userId, idiom_id: p.idiomId, data: p }, { onConflict: 'user_id,idiom_id' })).error)
    },
    async deleteProgress(id) {
      fail((await db.from('progress').delete().eq('user_id', userId).eq('idiom_id', id)).error)
    },
    async saveCustom(c) {
      fail((await db.from('custom_idioms').upsert({ user_id: userId, id: c.id, data: c }, { onConflict: 'user_id,id' })).error)
    },
    async deleteCustom(id) {
      fail((await db.from('custom_idioms').delete().eq('user_id', userId).eq('id', id)).error)
    },
    async addActivity(a) {
      fail((await db.from('activity').insert({ user_id: userId, ts: a.ts, kind: a.kind, points: a.points, correct: a.correct ?? null, idiom_id: a.idiomId ?? null })).error)
    },
    async savePrefs(p) {
      fail((await db.from('progress').upsert({ user_id: userId, idiom_id: '__prefs__', data: p }, { onConflict: 'user_id,idiom_id' })).error)
    },
    async saveSentences(x) {
      fail((await db.from('progress').upsert({ user_id: userId, idiom_id: '__sentences__', data: x }, { onConflict: 'user_id,idiom_id' })).error)
    },
    async saveClaims(c) {
      fail((await db.from('progress').upsert({ user_id: userId, idiom_id: '__claims__', data: c }, { onConflict: 'user_id,idiom_id' })).error)
    },
    async addRun(r) {
      fail((await db.from('exercise_runs').insert({ id: r.id, user_id: userId, ts: r.ts, type: r.type, total: r.total, correct: r.correct, topic: r.topic ?? null, idiom_ids: r.idiomIds })).error)
    },
  }
}
