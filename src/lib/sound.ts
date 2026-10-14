/**
 * Âm thanh do GYY tự tạo bằng Web Audio (không dùng tệp có bản quyền):
 * - hiệu ứng "ting" ngắn khi trả lời đúng / hoàn thành;
 * - nhạc nền nhẹ không lời (âm ngũ cung chậm), chỉ chạy sau khi người dùng chủ động bật.
 */
type AC = AudioContext
let ctx: AC | null = null
const sfx = { on: true, vol: 0.6 }
const music = { on: false, vol: 0.35 }
let master: GainNode | null = null
let timer: number | null = null
let pad: OscillatorNode[] = []
let padGain: GainNode | null = null

function ac(): AC | null {
  try {
    if (!ctx) {
      const C = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      if (!C) return null
      ctx = new C()
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    return ctx
  } catch { return null }
}

export function configureSfx(on: boolean, vol: number) { sfx.on = on; sfx.vol = Math.min(1, Math.max(0, vol)) }

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine', dest?: AudioNode) {
  const c = ctx!; const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(gain, start + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g); g.connect(dest ?? c.destination); o.start(start); o.stop(start + dur + 0.05)
}

/** Một tiếng "ting" trong trẻo, ngắn. Gọi đúng một lần cho mỗi sự kiện đã được xác nhận đúng. */
export function playCorrect() {
  if (!sfx.on || sfx.vol <= 0) return
  const c = ac(); if (!c) return
  try { const t = c.currentTime; tone(1318.5, t, 0.5, 0.22 * sfx.vol); tone(1975.5, t + 0.02, 0.35, 0.12 * sfx.vol) } catch { /* bỏ qua */ }
}
/** Hoàn thành một bước/phiên: hai nốt đi lên nhẹ nhàng. */
export function playComplete() {
  if (!sfx.on || sfx.vol <= 0) return
  const c = ac(); if (!c) return
  try { const t = c.currentTime; tone(988, t, 0.35, 0.18 * sfx.vol); tone(1318.5, t + 0.12, 0.45, 0.2 * sfx.vol); tone(1760, t + 0.26, 0.6, 0.16 * sfx.vol) } catch { /* bỏ qua */ }
}

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33] // C ngũ cung
function note() {
  if (!ctx || !master || !music.on) return
  const f = SCALE[Math.floor(Math.random() * SCALE.length)]
  const t = ctx.currentTime
  const o = ctx.createOscillator(); const g = ctx.createGain()
  o.type = 'sine'; o.frequency.value = f
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2)
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 4.4)
}

export function isMusicPlaying() { return music.on }

/** Chỉ có một luồng nhạc nền: gọi lại khi đang phát chỉ đổi âm lượng. */
export function startMusic(vol: number) {
  music.vol = vol
  if (music.on) { setMusicVolume(vol); return }
  const c = ac(); if (!c) return
  music.on = true
  master = c.createGain(); master.gain.value = 0.0001; master.connect(c.destination)
  master.gain.linearRampToValueAtTime(Math.max(0.0001, music.vol * 0.9), c.currentTime + 2)
  padGain = c.createGain(); padGain.gain.value = 0.35; padGain.connect(master)
  pad = [130.81, 196.0].map((f, i) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = i ? 4 : -4; o.connect(padGain!); o.start(); return o })
  note(); timer = window.setInterval(note, 3400)
}
export function setMusicVolume(v: number) {
  music.vol = v
  if (master && ctx) master.gain.linearRampToValueAtTime(Math.max(0.0001, v * 0.9), ctx.currentTime + 0.2)
}
export function stopMusic() {
  if (!music.on) return
  music.on = false
  if (timer !== null) { clearInterval(timer); timer = null }
  const c = ctx, m = master, p = pad
  if (c && m) { m.gain.cancelScheduledValues(c.currentTime); m.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.6) }
  window.setTimeout(() => { p.forEach((o) => { try { o.stop() } catch { /* đã dừng */ } }); try { m?.disconnect() } catch { /* bỏ qua */ } }, 800)
  master = null; pad = []; padGain = null
}
