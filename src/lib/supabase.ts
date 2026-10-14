import { createClient } from '@supabase/supabase-js'
import { firebaseConfigured } from './firebase'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null = chưa cấu hình backend → web chạy ở chế độ thử nghiệm trên thiết bị. */
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null
/** Cộng đồng và bảng xếp hạng hiện chỉ chạy với Supabase. */
export const communityConfigured = !!supabase
/** Có backend đăng nhập và lưu dữ liệu theo tài khoản (Firebase hoặc Supabase). */
export const backendConfigured = !!supabase || firebaseConfigured
