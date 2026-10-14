// Netlify Function (v2) giọng đọc Quan thoại qua Google Cloud Text-to-Speech.
// Khóa chỉ nằm ở biến môi trường GOOGLE_TTS_API_KEY của site Netlify. Bật ở frontend bằng VITE_TTS_ENDPOINT=/api/tts (lúc build).
//
// Giọng mặc định: Chirp 3 HD (cmn-CN), giới tính theo tài liệu Google https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd :
//   nữ: Leda (Female)    nam: Charon (Male)
// Đổi giọng bằng biến môi trường TTS_VOICE_FEMALE / TTS_VOICE_MALE (một mã trong danh sách cho phép bên dưới) mà không cần sửa code.
export const VOICES = {
  female: ['cmn-CN-Chirp3-HD-Leda', 'cmn-CN-Chirp3-HD-Aoede', 'cmn-CN-Chirp3-HD-Kore', 'cmn-CN-Chirp3-HD-Zephyr', 'cmn-CN-Wavenet-A', 'cmn-CN-Wavenet-D'],
  male: ['cmn-CN-Chirp3-HD-Charon', 'cmn-CN-Chirp3-HD-Orus', 'cmn-CN-Chirp3-HD-Puck', 'cmn-CN-Chirp3-HD-Algieba', 'cmn-CN-Chirp3-HD-Achird', 'cmn-CN-Wavenet-B', 'cmn-CN-Wavenet-C'],
} as const
export const DEFAULT_VOICE = { female: 'cmn-CN-Chirp3-HD-Leda', male: 'cmn-CN-Chirp3-HD-Charon' } as const
type Gender = 'female' | 'male'

/** Chọn voice: chỉ nhận mã nằm trong danh sách cho phép (chặn việc dùng voice tùy ý gây tốn phí). */
export function pickVoice(gender: Gender, requested: unknown, env: Record<string, string | undefined>): string {
  const allowed: readonly string[] = VOICES[gender]
  if (typeof requested === 'string' && allowed.includes(requested)) return requested
  const fromEnv = env[gender === 'male' ? 'TTS_VOICE_MALE' : 'TTS_VOICE_FEMALE']
  return fromEnv && allowed.includes(fromEnv) ? fromEnv : DEFAULT_VOICE[gender]
}

const hits = new Map<string, number[]>()
const limited = (ip: string) => {
  const now = Date.now(); const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  arr.push(now); hits.set(ip, arr); return arr.length > 40
}
const err = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export default async (req: Request, context: { ip?: string }) => {
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const key = process.env.GOOGLE_TTS_API_KEY
  if (!key) return err(501, 'not_configured')
  if (limited(context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'unknown')) return err(429, 'rate_limited')
  let body: { text?: unknown; gender?: unknown; rate?: unknown; voice?: unknown }
  try { body = (await req.json()) as typeof body } catch { return err(400, 'bad_request') }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const gender: Gender = body.gender === 'male' ? 'male' : 'female'
  const rate = Math.min(1.5, Math.max(0.5, Number(body.rate) || 0.9))
  if (!text || text.length > 200 || !/[\u4e00-\u9fff]/.test(text)) return err(400, 'bad_text')
  const voice = pickVoice(gender, body.voice, process.env)
  const call = (withRate: boolean) => fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'cmn-CN', name: voice }, audioConfig: { audioEncoding: 'MP3', ...(withRate ? { speakingRate: rate } : {}) } }),
  })
  try {
    let r = await call(true)
    if (r.status === 400) r = await call(false) // một số giọng không nhận tốc độ: thử lại không có tốc độ
    if (!r.ok) return err(r.status === 403 || r.status === 429 ? 429 : 502, r.status === 403 ? 'quota_or_permission' : r.status === 429 ? 'quota_exceeded' : 'upstream_error')
    const j = (await r.json()) as { audioContent?: string }
    if (!j.audioContent) return err(502, 'upstream_error')
    const bin = Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0))
    return new Response(bin, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'x-tts-voice': voice } })
  } catch { return err(502, 'upstream_error') }
}
