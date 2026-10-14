import type { Activity, CustomIdiom, ExerciseRun, Prefs, Progress, SentenceRecord, UserState } from '../types'
import { emptyUserState } from '../types'
import { firebase } from '../lib/firebase'
import type { Repo } from './repo'

/**
 * Lưu dữ liệu học trong Firestore theo đường dẫn users/{uid}/…; Security Rules (firestore.rules) chỉ cho chủ tài khoản đọc/ghi.
 * progress/{idiomId}, custom/{id}, activity/{auto}, runs/{id}, meta/prefs, meta/claims, meta/sentences.
 */
export function createFirestoreRepo(uid: string): Repo {
  const f = async () => {
    const [{ db }, fs] = await Promise.all([firebase(), import('firebase/firestore')])
    const col = (name: string) => fs.collection(db, 'users', uid, name)
    const ref = (name: string, id: string) => fs.doc(db, 'users', uid, name, id)
    return { fs, col, ref }
  }
  return {
    async load() {
      const { fs, col, ref } = await f()
      const [p, c, a, r, prefs, claims, sentences] = await Promise.all([
        fs.getDocs(col('progress')), fs.getDocs(col('custom')),
        fs.getDocs(fs.query(col('activity'), fs.orderBy('ts', 'asc'), fs.limit(20000))),
        fs.getDocs(fs.query(col('runs'), fs.orderBy('ts', 'desc'), fs.limit(500))),
        fs.getDoc(ref('meta', 'prefs')), fs.getDoc(ref('meta', 'claims')), fs.getDoc(ref('meta', 'sentences')),
      ])
      const s: UserState = emptyUserState()
      p.forEach((d) => { s.progress[d.id] = d.data() as Progress })
      s.custom = c.docs.map((d) => d.data() as CustomIdiom)
      s.activity = a.docs.map((d) => d.data() as Activity)
      s.runs = r.docs.map((d) => d.data() as ExerciseRun)
      if (prefs.exists()) s.prefs = { ...s.prefs, ...(prefs.data() as Prefs) }
      if (claims.exists()) s.claims = (claims.data() as { days?: Record<string, string[]> }).days ?? {}
      if (sentences.exists()) s.sentences = (sentences.data() as { items?: SentenceRecord[] }).items ?? []
      return s
    },
    async saveProgress(pr) { const { fs, ref } = await f(); await fs.setDoc(ref('progress', pr.idiomId), pr) },
    async deleteProgress(id) { const { fs, ref } = await f(); await fs.deleteDoc(ref('progress', id)) },
    async saveCustom(c) { const { fs, ref } = await f(); await fs.setDoc(ref('custom', c.id), c) },
    async deleteCustom(id) { const { fs, ref } = await f(); await fs.deleteDoc(ref('custom', id)) },
    async addActivity(a) {
      const { fs, col, ref } = await f()
      // Học xong bài và thưởng nhiệm vụ dùng mã cố định (create-only) nên không thể ghi trùng để lấy thêm XP; Security Rules kiểm tra khớp mã.
      const id = a.kind === 'learn' && a.idiomId ? `learn-${a.idiomId}` : a.kind === 'bonus' && a.ref ? `bonus-${a.ref}` : null
      if (!id) { await fs.addDoc(col('activity'), a); return }
      try { await fs.setDoc(ref('activity', id), a) } catch (e) {
        // Bản ghi đã tồn tại (đã tính XP trước đó): bỏ qua, không phải lỗi.
        if ((e as { code?: string }).code !== 'permission-denied') throw e
      }
    },
    async addRun(r) { const { fs, ref } = await f(); await fs.setDoc(ref('runs', r.id), r) },
    async savePrefs(p) { const { fs, ref } = await f(); await fs.setDoc(ref('meta', 'prefs'), p) },
    async saveClaims(c) { const { fs, ref } = await f(); await fs.setDoc(ref('meta', 'claims'), { days: c }) },
    async saveSentences(items) { const { fs, ref } = await f(); await fs.setDoc(ref('meta', 'sentences'), { items }) },
  }
}
