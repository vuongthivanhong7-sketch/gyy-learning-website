import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, backendConfigured } from '../lib/supabase'
import { firebase, firebaseConfigured } from '../lib/firebase'

interface FbUser { uid: string; displayName: string | null; photoURL: string | null }
/** Chuyển mã lỗi Firebase Authentication thành thông báo dễ hiểu. */
function fbError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên rồi thử lại.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.', 'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Authorized domains trong Firebase.',
    'auth/operation-not-allowed': 'Đăng nhập Google chưa được bật trong Firebase.', 'auth/network-request-failed': 'Lỗi kết nối mạng. Hãy thử lại.',
    'auth/invalid-api-key': 'Cấu hình Firebase chưa đúng (API key).',
  }
  return map[code] ?? 'Không đăng nhập được. Hãy thử lại.'
}

export interface Account { id: string; displayName: string; avatarUrl?: string }
interface Ctx {
  backendConfigured: boolean
  loading: boolean
  account: Account | null
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
  updateDisplayName: (name: string) => Promise<string | null>
  /** Mở hộp thoại yêu cầu đăng nhập. */
  promptLogin: (reason?: string) => void
  loginPrompt: { open: boolean; reason?: string }
  closeLoginPrompt: () => void
}
const C = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [fbUser, setFbUser] = useState<FbUser | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [loading, setLoading] = useState(backendConfigured)
  const [loginPrompt, setLoginPrompt] = useState<{ open: boolean; reason?: string }>({ open: false })

  // Firebase Authentication (ưu tiên nếu đã cấu hình): theo dõi trạng thái đăng nhập thực tế, kể cả sau khi tải lại trang hoặc chuyển hướng.
  useEffect(() => {
    if (!firebaseConfigured) return
    let off = () => {}
    let dead = false
    void (async () => {
      try {
        const { auth } = await firebase()
        const m = await import('firebase/auth')
        void m.getRedirectResult(auth).catch(() => {})
        off = m.onAuthStateChanged(auth, (u) => { if (dead) return; setFbUser(u ? { uid: u.uid, displayName: u.displayName, photoURL: u.photoURL } : null); setLoading(false) }, () => { if (!dead) setLoading(false) })
      } catch { if (!dead) setLoading(false) }
    })()
    return () => { dead = true; off() }
  }, [])

  useEffect(() => {
    if (!supabase || firebaseConfigured) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = firebaseConfigured ? fbUser?.uid : session?.user.id
  useEffect(() => {
    if (!supabase || firebaseConfigured || !uid) { setDisplayName(''); return }
    supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle().then(({ data }) => {
      setDisplayName((data?.display_name as string | undefined) ?? 'Học viên')
    })
  }, [uid])

  const signInWithGoogle = useCallback(async () => {
    if (firebaseConfigured) {
      try {
        const { auth } = await firebase()
        const m = await import('firebase/auth')
        const provider = new m.GoogleAuthProvider()
        // Luôn hiện trình chọn tài khoản Google; không gợi ý sẵn tài khoản nào.
        provider.setCustomParameters({ prompt: 'select_account' })
        // Điện thoại: chuyển hướng (ổn định hơn cửa sổ bật lên); máy tính: cửa sổ bật lên.
        if (window.matchMedia('(pointer: coarse)').matches) { await m.signInWithRedirect(auth, provider); return null }
        await m.signInWithPopup(auth, provider)
        return null
      } catch (e) { return fbError(e) }
    }
    if (!supabase) return 'Chưa cấu hình đăng nhập. Xem file HUONG_DAN_CAU_HINH.md.'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        // Luôn hiện trình chọn tài khoản Google; không gợi ý sẵn tài khoản nào.
        queryParams: { prompt: 'select_account' },
      },
    })
    return error ? error.message : null
  }, [])

  const signOut = useCallback(async () => {
    if (firebaseConfigured) { try { const { auth } = await firebase(); await auth.signOut() } catch { /* bỏ qua */ } setFbUser(null); setDisplayName(''); return }
    if (supabase) await supabase.auth.signOut()
    setSession(null)
  }, [])

  const updateDisplayName = useCallback(async (name: string) => {
    const clean = name.trim().slice(0, 30)
    if (firebaseConfigured) {
      if (!fbUser) return 'Chưa đăng nhập.'
      if (clean.length < 2) return 'Tên hiển thị cần từ 2 ký tự.'
      try { const { auth } = await firebase(); const m = await import('firebase/auth'); if (auth.currentUser) await m.updateProfile(auth.currentUser, { displayName: clean }); setDisplayName(clean); return null } catch (e) { return fbError(e) }
    }
    if (!supabase || !uid) return 'Chưa đăng nhập.'
    if (clean.length < 2) return 'Tên hiển thị cần từ 2 ký tự.'
    const { error } = await supabase.from('profiles').update({ display_name: clean }).eq('id', uid)
    if (!error) setDisplayName(clean)
    return error ? error.message : null
  }, [uid])

  const value = useMemo<Ctx>(() => ({
    backendConfigured, loading,
    account: firebaseConfigured
      ? (fbUser ? { id: fbUser.uid, displayName: displayName || fbUser.displayName || 'Học viên', avatarUrl: fbUser.photoURL || undefined } : null)
      : session ? { id: session.user.id, displayName: displayName || 'Học viên', avatarUrl: (session.user.user_metadata?.avatar_url as string | undefined) || undefined } : null,
    signInWithGoogle, signOut, updateDisplayName,
    promptLogin: (reason) => setLoginPrompt({ open: true, reason }),
    loginPrompt, closeLoginPrompt: () => setLoginPrompt({ open: false }),
  }), [session, fbUser, displayName, loading, loginPrompt, signInWithGoogle, signOut, updateDisplayName])
  return <C.Provider value={value}>{children}</C.Provider>
}

export const useAuth = () => {
  const v = useContext(C)
  if (!v) throw new Error('AuthProvider missing')
  return v
}
