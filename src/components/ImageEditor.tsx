import { useRef, useState } from 'react'
import { RotateCcw, Trash2, Upload } from 'lucide-react'
import { useOverrides } from '../store/OverridesContext'
import { LICENSES, LICENSE_UNVERIFIED, fileToDataUrl } from '../lib/overrides'
import type { Idiom, ImageCredit } from '../types'

/** Quản lý hình minh họa của một Quán dụng ngữ: xem, tải lên / dán đường dẫn, xem trước, lưu, khôi phục, xóa. */
export function ImageEditor({ idiom, onClose }: { idiom: Idiom; onClose: () => void }) {
  const { local, update, saveError } = useOverrides()
  const hist = local.images[idiom.id]?.history ?? []
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const [urlIn, setUrlIn] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [credit, setCredit] = useState<ImageCredit>({ license: LICENSES[0] })
  const fileRef = useRef<HTMLInputElement>(null)

  const setCreditField = (k: keyof ImageCredit, v: string) => setCredit((c) => ({ ...c, [k]: v }))
  const pickMode = (m: 'upload' | 'url') => { setMode(m); setPreview(null); setErr(''); setBroken(false); setCredit((c) => ({ ...c, license: m === 'upload' ? LICENSES[0] : LICENSE_UNVERIFIED })) }
  const onFile = async (f?: File) => {
    if (!f) return
    setErr(''); setBusy(true)
    try { setPreview(await fileToDataUrl(f)); setBroken(false) } catch (e) { setErr((e as Error).message); setPreview(null) } finally { setBusy(false) }
  }
  const onUrl = () => {
    const u = urlIn.trim()
    if (!/^https?:\/\/\S+$/i.test(u)) { setErr('Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://'); setPreview(null); return }
    setErr(''); setBroken(false); setPreview(u)
  }
  const stamp = () => new Date().toISOString()
  const pushHistory = (h: typeof hist): typeof hist => (idiom.image ? [{ url: idiom.image, credit: idiom.imageCredit, replacedAt: stamp() }, ...h].slice(0, 5) : h)

  const save = () => {
    if (!preview || broken) return
    if (mode === 'url' && !credit.sourceUrl?.trim()) { setErr('Hãy ghi trang nguồn của ảnh để kiểm tra quyền sử dụng.'); return }
    update((o) => ({ ...o, images: { ...o.images, [idiom.id]: { url: preview, credit: cleanCredit(credit), updatedAt: stamp(), history: pushHistory(o.images[idiom.id]?.history ?? []) } } }))
    onClose()
  }
  const remove = () => {
    if (!confirm('Xóa hình hiện tại và dùng ô thay thế mặc định?')) return
    update((o) => ({ ...o, images: { ...o.images, [idiom.id]: { url: null, updatedAt: stamp(), history: pushHistory(o.images[idiom.id]?.history ?? []) } } }))
    onClose()
  }
  const restore = (k: number) => update((o) => {
    const cur = o.images[idiom.id]; const h = cur?.history ?? []; const target = h[k]
    if (!target) return o
    const rest = h.filter((_, j) => j !== k)
    const newHist = idiom.image ? [{ url: idiom.image, credit: idiom.imageCredit, replacedAt: stamp() }, ...rest].slice(0, 5) : rest
    return { ...o, images: { ...o.images, [idiom.id]: { url: target.url, credit: target.credit, updatedAt: stamp(), history: newHist } } }
  })

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand/40 bg-card p-4">
      <p className="font-extrabold">Hình minh họa của <span className="han">{idiom.hanzi}</span></p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-bold text-muted">Hình hiện tại</p>
          {idiom.image ? <img src={idiom.image} alt="Hình hiện tại" className="max-h-48 w-full rounded-xl bg-white object-contain" /> : <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Chưa có hình</p>}
          {idiom.imageCredit && <p className="mt-1 text-xs text-muted">{[idiom.imageCredit.author, idiom.imageCredit.license].filter(Boolean).join(' · ')}</p>}
        </div>
        <div>
          <p className="mb-1 text-sm font-bold text-muted">Xem trước hình mới</p>
          {preview && !broken ? <img src={preview} alt="Xem trước" onError={() => setBroken(true)} className="max-h-48 w-full rounded-xl bg-white object-contain" /> : <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{broken ? 'Không tải được ảnh từ đường dẫn này.' : 'Chọn ảnh hoặc dán đường dẫn'}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-soft p-1.5" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'upload'} onClick={() => pickMode('upload')} className={`min-h-[44px] rounded-xl font-bold ${mode === 'upload' ? 'bg-card text-brand-strong shadow-card' : 'text-muted'}`}>Tải ảnh lên</button>
        <button type="button" role="tab" aria-selected={mode === 'url'} onClick={() => pickMode('url')} className={`min-h-[44px] rounded-xl font-bold ${mode === 'url' ? 'bg-card text-brand-strong shadow-card' : 'text-muted'}`}>Dùng đường dẫn</button>
      </div>
      {mode === 'upload' ? (
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <button type="button" className="btn-soft" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={18} />{busy ? 'Đang xử lý…' : 'Chọn ảnh từ thiết bị'}</button>
          <p className="mt-1 text-xs text-muted">Ảnh được thu nhỏ (tối đa 640 px) để lưu bền vững trong trình duyệt.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row"><input className="input !text-base" value={urlIn} onChange={(e) => setUrlIn(e.target.value)} placeholder="https://…/anh.jpg" aria-label="Đường dẫn ảnh" /><button type="button" className="btn-soft sm:shrink-0" onClick={onUrl}>Xem trước</button></div>
      )}

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-bold text-muted">Nguồn và quyền sử dụng (bắt buộc ghi rõ khi dùng ảnh từ web)</legend>
        <input className="input !min-h-[48px] !text-base" placeholder={mode === 'url' ? 'Trang nguồn của ảnh (bắt buộc)' : 'Trang nguồn (nếu có)'} value={credit.sourceUrl ?? ''} onChange={(e) => setCreditField('sourceUrl', e.target.value)} aria-label="Trang nguồn" />
        <input className="input !min-h-[48px] !text-base" placeholder="Tác giả / ghi công" value={credit.author ?? ''} onChange={(e) => setCreditField('author', e.target.value)} aria-label="Tác giả" />
        <select className="input !min-h-[48px] !text-base sm:col-span-2" value={credit.license ?? LICENSE_UNVERIFIED} onChange={(e) => setCreditField('license', e.target.value)} aria-label="Giấy phép">{LICENSES.map((l) => <option key={l}>{l}</option>)}</select>
      </fieldset>
      {credit.license === LICENSE_UNVERIFIED && <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">Ảnh xuất hiện trên Google Images không mặc định được tự do sử dụng. Hãy kiểm tra trang nguồn; nếu chưa chắc, thay bằng ảnh có giấy phép rõ ràng hoặc ảnh tự tải lên.</p>}
      {err && <p className="text-sm font-bold text-bad" role="alert">{err}</p>}
      {saveError && <p className="text-sm font-bold text-bad" role="alert">{saveError}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={save} disabled={!preview || broken}>Lưu hình mới</button>
        <button type="button" className="btn-ghost" onClick={onClose}>Hủy</button>
        {idiom.image && <button type="button" className="btn-ghost !text-bad" onClick={remove}><Trash2 size={18} />Xóa hình</button>}
      </div>

      {hist.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-bold text-muted">Hình trước đó (tối đa 5)</p>
          <ul className="flex flex-wrap gap-2">{hist.map((h, k) => (
            <li key={k} className="flex w-28 flex-col gap-1"><img src={h.url} alt={`Hình cũ ${k + 1}`} className="h-20 w-full rounded-lg bg-white object-cover" /><button type="button" className="btn-ghost !min-h-[40px] !px-2 !text-sm" onClick={() => restore(k)}><RotateCcw size={14} />Khôi phục</button></li>
          ))}</ul>
        </div>
      )}
    </div>
  )
}
const cleanCredit = (c: ImageCredit): ImageCredit => Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'string' && v.trim())) as ImageCredit
