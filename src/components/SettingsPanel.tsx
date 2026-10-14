import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { LANGS, useI18n } from '../i18n'
import { useUserData } from '../store/UserData'
import { availableGenders, canSpeak, speak, TTS_ENDPOINT } from '../lib/speech'
import { playCorrect } from '../lib/sound'

const SAMPLE = '你好，欢迎来到 GYY，一起学习惯用语。'

function useGenders() {
  const [g, setG] = useState(availableGenders)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const on = () => setG(availableGenders())
    window.speechSynthesis.addEventListener('voiceschanged', on); on()
    return () => window.speechSynthesis.removeEventListener('voiceschanged', on)
  }, [])
  return g
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5 rounded-2xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"><span className="font-bold">{label}</span><div className="flex min-w-0 items-center gap-3">{children}</div></div>
}

/** Ngôn ngữ giao diện, nhạc nền, hiệu ứng khi trả lời đúng và giọng đọc tiếng Trung. */
export function SettingsPanel() {
  const { t: tr, lang, setLang } = useI18n()
  const { state, setPrefs } = useUserData()
  const p = state.prefs
  const g = useGenders()
  const voice = p.voice ?? 'default'
  const rate = p.voiceRate ?? 0.9
  const chk = 'h-6 w-6 accent-[rgb(var(--brand))]'
  const range = 'h-2 w-36 accent-[rgb(var(--brand))] sm:w-44'
  const VoiceOpt = ({ v, label, ok, note }: { v: 'default' | 'female' | 'male'; label: string; ok: boolean; note?: string }) => (
    <label className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 ${voice === v ? 'border-brand bg-brand-soft' : 'border-line'} ${ok ? '' : 'opacity-50'}`}>
      <input type="radio" name="voice" className={chk} checked={voice === v} disabled={!ok} onChange={() => setPrefs({ voice: v })} />
      <span className="min-w-0 flex-1"><span className="font-bold">{label}</span>{!ok && note && <span className="block text-xs text-muted">{note}</span>}</span>
    </label>
  )
  return (
    <section className="card flex flex-col gap-3 p-5" aria-labelledby="h-settings">
      <h2 id="h-settings" className="text-lg font-extrabold">{tr('Cài đặt')}</h2>

      <Row label={tr('Ngôn ngữ giao diện')}>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={tr('Ngôn ngữ giao diện')}>
          {LANGS.map((l) => <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} onClick={() => setLang(l.code)} className={`min-h-[44px] rounded-xl border-2 px-3 text-sm font-extrabold ${lang === l.code ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line'}`}>{l.label}</button>)}
        </div>
      </Row>

      <h3 className="mt-2 text-base font-extrabold">{tr('Âm thanh và giọng đọc')}</h3>
      <Row label={tr('Nhạc nền')}>
        <input type="checkbox" className={chk} checked={p.musicOn} onChange={(e) => setPrefs({ musicOn: e.target.checked })} aria-label={tr('Nhạc nền')} />
        <input type="range" min={0} max={1} step={0.05} className={range} value={p.musicVol} onChange={(e) => setPrefs({ musicVol: +e.target.value })} aria-label={tr('Âm lượng nhạc nền')} />
      </Row>
      {p.musicOn && <p className="-mt-1 text-xs text-muted">{tr('Nhạc nền do GYY tự tạo, chỉ bắt đầu phát sau khi bạn chạm vào trang.')}</p>}
      <Row label={tr('Hiệu ứng khi trả lời đúng')}>
        <input type="checkbox" className={chk} checked={p.sfxOn} onChange={(e) => setPrefs({ sfxOn: e.target.checked })} aria-label={tr('Hiệu ứng khi trả lời đúng')} />
        <input type="range" min={0} max={1} step={0.05} className={range} value={p.sfxVol} onChange={(e) => setPrefs({ sfxVol: +e.target.value })} aria-label={tr('Âm lượng hiệu ứng')} />
        <button type="button" className="btn-soft !min-h-[44px] !px-3" onClick={() => playCorrect()} disabled={!p.sfxOn}><Volume2 size={18} /></button>
      </Row>

      <div className="flex flex-col gap-2 rounded-2xl border border-line p-3">
        <span className="font-bold">{tr('Giọng đọc tiếng Trung')}</span>
        {!canSpeak() ? <p className="text-sm text-muted">{tr('Trình duyệt này không hỗ trợ giọng đọc.')}</p> : (
          <>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr('Giọng đọc tiếng Trung')}>
              <VoiceOpt v="default" label={tr('Mặc định của thiết bị')} ok />
              <VoiceOpt v="female" label={tr('Giọng nữ')} ok={g.female} note={tr('Thiết bị này chưa có giọng nữ tiếng Trung.')} />
              <VoiceOpt v="male" label={tr('Giọng nam')} ok={g.male} note={tr('Thiết bị này chưa có giọng nam tiếng Trung.')} />
            </div>
            <p className="text-xs text-muted">{TTS_ENDPOINT ? tr('Đang dùng dịch vụ TTS qua máy chủ.') : tr('Đang dùng giọng có sẵn trên thiết bị; giọng nam/nữ tùy thiết bị.')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-bold">{tr('Tốc độ đọc')}
                <select className="input !min-h-[44px] !w-auto !py-1 !text-base" value={rate} onChange={(e) => setPrefs({ voiceRate: +e.target.value })}>
                  <option value={0.7}>{tr('Chậm')}</option><option value={0.9}>{tr('Bình thường')}</option><option value={1.1}>{tr('Nhanh')}</option>
                </select></label>
              <button type="button" className="btn-soft !min-h-[44px]" onClick={() => void speak(SAMPLE, { key: 'preview' })}><Volume2 size={18} />{tr('Nghe thử')}</button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
