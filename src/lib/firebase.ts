/** Cấu hình Firebase Web App. Chỉ bật khi có đủ biến môi trường VITE_FIREBASE_*; không có thì GYY dùng Supabase hoặc chế độ trên máy. */
const env = import.meta.env as Record<string, string | undefined>
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}
export const firebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)

let cached: Promise<{ auth: import('firebase/auth').Auth; db: import('firebase/firestore').Firestore }> | null = null
/** Khởi tạo Firebase một lần (nạp SDK khi cần). */
export function firebase() {
  if (!firebaseConfigured) return Promise.reject(new Error('firebase-not-configured'))
  if (!cached) {
    cached = (async () => {
      const [{ initializeApp, getApps }, { getAuth }, { initializeFirestore }] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
      const app = getApps()[0] ?? initializeApp(firebaseConfig)
      // Firestore không nhận giá trị undefined; bỏ qua các trường undefined thay vì báo lỗi.
      return { auth: getAuth(app), db: initializeFirestore(app, { ignoreUndefinedProperties: true }) }
    })()
  }
  return cached
}
