import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import { useUserData } from '../store/UserData'
import { configureVoice } from '../lib/speech'
import { configureSfx, isMusicPlaying, setMusicVolume, startMusic, stopMusic } from '../lib/sound'

/** Đồng bộ ngôn ngữ và âm thanh với tùy chọn đã lưu (theo tài khoản hoặc theo trình duyệt). */
export function PrefsSync() {
  const { lang, setLang } = useI18n()
  const { state, loading, setPrefs } = useUserData()
  const p = state.prefs
  const langLoaded = useRef(false)

  // Ngôn ngữ: khi tải xong dữ liệu người dùng, ưu tiên lựa chọn đã lưu; sau đó mọi thay đổi được lưu lại.
  useEffect(() => {
    if (loading || langLoaded.current) return
    langLoaded.current = true
    if (p.lang && p.lang !== lang) setLang(p.lang)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (langLoaded.current && p.lang !== lang) setPrefs({ lang }) }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { configureSfx(p.sfxOn, p.sfxVol) }, [p.sfxOn, p.sfxVol])
  useEffect(() => { configureVoice(p.voice ?? 'default', p.voiceRate ?? 0.9) }, [p.voice, p.voiceRate])

  // Nhạc nền: chỉ phát sau một tương tác của người dùng (trình duyệt chặn tự phát).
  useEffect(() => {
    if (!p.musicOn) { stopMusic(); return }
    if (isMusicPlaying()) { setMusicVolume(p.musicVol); return }
    const go = () => { startMusic(p.musicVol); off() }
    const off = () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go) }
    window.addEventListener('pointerdown', go, { once: true }); window.addEventListener('keydown', go, { once: true })
    return off
  }, [p.musicOn, p.musicVol])
  return null
}
