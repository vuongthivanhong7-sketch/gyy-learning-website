/**
 * Giọng đọc tiếng Trung. Ưu tiên dịch vụ TTS qua backend (nếu cấu hình VITE_TTS_ENDPOINT) để có giọng nam/nữ rõ ràng;
 * nếu không thì dùng giọng zh-CN có sẵn trên thiết bị. Chỉ gán nam/nữ cho những giọng có tên được biết rõ.
 */
export type VoicePref = 'default' | 'female' | 'male'
export type Gender = 'female' | 'male' | 'unknown'

// Các giọng Quan thoại có tên rõ ràng trên Windows, Edge, macOS/iOS. Giọng không có trong danh sách (ví dụ "Google 普通话") không được suy đoán giới tính.
const FEMALE = /xiaoxiao|xiaoyi|xiaochen|xiaohan|xiaomeng|xiaomo|xiaoqiu|xiaorui|xiaoshuang|xiaoxuan|xiaoyan|xiaoyou|xiaozhen|huihui|yaoyao|ting-?ting|\bfemale\b/i
const MALE = /yunxi|yunjian|yunyang|yunfeng|yunhao|yunze|yunye|kangkang|li-?mu|\bmale\b/i
export function classifyVoice(name: string): Gender {
  if (FEMALE.test(name)) return 'female'
  if (MALE.test(name)) return 'male'
  return 'unknown'
}

const settings = { pref: 'default' as VoicePref, rate: 0.9 }
export function configureVoice(pref: VoicePref, rate: number) { settings.pref = pref; settings.rate = Math.min(1.4, Math.max(0.5, rate)) }
export const TTS_ENDPOINT = (import.meta.env.VITE_TTS_ENDPOINT as string | undefined) || ''

export const canSpeak = () => typeof window !== 'undefined' && ('speechSynthesis' in window || !!TTS_ENDPOINT)

export function zhVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter((v) => /^zh[-_]?(cn|hans)?$/i.test(v.lang) || /^zh[-_]CN/i.test(v.lang))
}
/** Giới tính nào thực sự có giọng đọc (trên thiết bị, hoặc qua dịch vụ TTS đã cấu hình). */
export function availableGenders(): { female: boolean; male: boolean; cloud: boolean } {
  const vs = zhVoices().map((v) => classifyVoice(v.name))
  return { female: !!TTS_ENDPOINT || vs.includes('female'), male: !!TTS_ENDPOINT || vs.includes('male'), cloud: !!TTS_ENDPOINT }
}

type Listener = () => void
const listeners = new Set<Listener>()
let speakingKey: string | null = null
let audio: HTMLAudioElement | null = null
export const subscribeSpeaking = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l) } }
export const currentSpeaking = () => speakingKey
const setSpeaking = (k: string | null) => { speakingKey = k; listeners.forEach((l) => l()) }

export function stopSpeaking() {
  try { if ('speechSynthesis' in window) window.speechSynthesis.cancel() } catch { /* bỏ qua */ }
  if (audio) { audio.pause(); audio = null }
  setSpeaking(null)
}

/** Thông báo cho người dùng khi giọng Google không dùng được (không im lặng chuyển giọng). */
let notice: string | null = null
export const currentNotice = () => notice
export const clearNotice = () => { notice = null; listeners.forEach((l) => l()) }
const setNotice = (m: string) => { notice = m; listeners.forEach((l) => l()) }
const REASON: Record<string, string> = {
  not_configured: 'Giọng Google chưa được cấu hình trên máy chủ (thiếu khóa).',
  quota_or_permission: 'Giọng Google không dùng được (hết hạn mức hoặc khóa chưa có quyền).',
  quota_exceeded: 'Giọng Google đã vượt hạn mức, vui lòng thử lại sau.',
  rate_limited: 'Bạn bấm quá nhanh, vui lòng thử lại sau ít giây.',
  network: 'Không kết nối được máy chủ giọng đọc.',
}

export interface CloudResult { ok: boolean; voice?: string; reason?: string }
/** Gọi dịch vụ TTS qua backend và phát âm thanh trả về. */
export async function cloudSpeak(text: string, gender: 'female' | 'male', rate: number, key: string, voice?: string): Promise<CloudResult> {
  try {
    const r = await fetch(TTS_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, gender, rate, voice }) })
    if (!r.ok) { let code = 'upstream_error'; try { code = ((await r.json()) as { error?: string }).error ?? code } catch { /* không phải JSON */ } return { ok: false, reason: code } }
    const url = URL.createObjectURL(await r.blob())
    audio = new Audio(url)
    audio.onended = () => { URL.revokeObjectURL(url); if (speakingKey === key) setSpeaking(null) }
    audio.onerror = () => { if (speakingKey === key) setSpeaking(null) }
    await audio.play()
    return { ok: true, voice: r.headers.get('x-tts-voice') ?? undefined }
  } catch { return { ok: false, reason: 'network' } }
}

/** Phát một đoạn tiếng Trung. Chỉ gọi từ thao tác của người dùng. Bấm lại đúng nút đang phát thì dừng. */
export async function speak(text: string, opts: { audioUrl?: string; key?: string; rate?: number } = {}): Promise<void> {
  const key = opts.key ?? text
  if (speakingKey === key) { stopSpeaking(); return }
  stopSpeaking()
  setSpeaking(key)
  const rate = opts.rate ?? settings.rate
  if (opts.audioUrl) {
    audio = new Audio(opts.audioUrl); audio.onended = () => setSpeaking(null); audio.onerror = () => setSpeaking(null)
    void audio.play().catch(() => setSpeaking(null)); return
  }
  if (TTS_ENDPOINT) {
    // Có dịch vụ Google: mặc định dùng giọng nữ; chọn "nam" thì dùng giọng nam.
    const res = await cloudSpeak(text, settings.pref === 'male' ? 'male' : 'female', rate, key)
    if (res.ok) return
    setNotice((REASON[res.reason ?? ''] ?? 'Giọng Google tạm thời không dùng được.') + ' Đang dùng giọng có sẵn trên thiết bị.')
  }
  if (!('speechSynthesis' in window)) { setSpeaking(null); setNotice('Thiết bị này không có giọng đọc.'); return }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'; u.rate = rate
  const vs = zhVoices()
  const v = settings.pref === 'default' ? vs[0] : vs.find((x) => classifyVoice(x.name) === settings.pref)
  if (v) u.voice = v
  u.onend = () => { if (speakingKey === key) setSpeaking(null) }
  u.onerror = () => { if (speakingKey === key) setSpeaking(null) }
  window.speechSynthesis.speak(u)
}
