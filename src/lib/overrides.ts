import { idiomTopics, type Idiom, type ImageCredit } from '../types'

export interface ImageOv {
  /** null = đã xóa ảnh (dùng ảnh thay thế mặc định). */
  url: string | null
  credit?: ImageCredit
  updatedAt: string
  history: { url: string; credit?: ImageCredit; replacedAt: string }[]
}
export interface Overrides {
  version: 1
  /** Ghi chú về nguồn gốc chủ đề (ví dụ: do GYY phân loại tự động, chưa kiểm duyệt). */
  topicsNote?: string
  /** Danh mục chủ đề do quản trị viên quản lý. */
  topicList: string[]
  /** Chủ đề theo mã Quán dụng ngữ (ghi đè dữ liệu gốc). Một mục có thể có nhiều chủ đề. */
  topics: Record<string, string[]>
  images: Record<string, ImageOv>
}
export const emptyOverrides = (): Overrides => ({ version: 1, topicList: [], topics: {}, images: {} })

export function normalizeOverrides(x: Partial<Overrides> | null | undefined): Overrides {
  const o = emptyOverrides()
  if (!x || typeof x !== 'object') return o
  if (typeof x.topicsNote === 'string') o.topicsNote = x.topicsNote
  if (Array.isArray(x.topicList)) o.topicList = x.topicList.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim())
  if (x.topics && typeof x.topics === 'object') for (const [k, v] of Object.entries(x.topics)) if (Array.isArray(v)) o.topics[k] = v.filter((t) => typeof t === 'string' && t.trim())
  if (x.images && typeof x.images === 'object') for (const [k, v] of Object.entries(x.images)) if (v && typeof v === 'object' && 'updatedAt' in v) o.images[k] = { ...v, history: Array.isArray(v.history) ? v.history : [] }
  return o
}

/** Gộp: bản đi kèm trang web (file) và bản nháp trên máy (local). Local ưu tiên theo từng mã. */
export function mergeOverrides(file: Overrides, local: Overrides): Overrides {
  return {
    version: 1,
    topicsNote: local.topicsNote ?? file.topicsNote,
    topicList: [...new Set([...file.topicList, ...local.topicList])],
    topics: { ...file.topics, ...local.topics },
    images: { ...file.images, ...local.images },
  }
}

export function applyOverrides(idioms: Idiom[], ov: Overrides): Idiom[] {
  return idioms.map((i) => {
    const t = ov.topics[i.id]
    const im = ov.images[i.id]
    if (!t && !im) return i
    const out: Idiom = { ...i }
    if (t) out.topics = t
    if (im) {
      if (im.url === null) { delete out.image; delete out.imageCredit } else { out.image = im.url; out.imageCredit = im.credit }
    }
    return out
  })
}

export const allTopics = (idioms: Idiom[], ov: Overrides): string[] =>
  [...new Set([...ov.topicList, ...idioms.flatMap(idiomTopics)])].sort((a, b) => a.localeCompare(b, 'vi'))

export const LICENSES = [
  'Ảnh của tôi (tự chụp/tự tạo hoặc có quyền sử dụng)',
  'Public domain / CC0',
  'CC BY',
  'CC BY-SA',
  'Được phép sử dụng theo thỏa thuận với chủ ảnh',
  'Chưa xác minh giấy phép',
] as const
export const LICENSE_UNVERIFIED = 'Chưa xác minh giấy phép'

/** Nén ảnh tải lên: tối đa 640 px, JPEG, để lưu được bền vững trong trình duyệt. */
export function fileToDataUrl(file: File, max = 640, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Tệp không phải là ảnh.'))
    if (file.size > 12 * 1024 * 1024) return reject(new Error('Ảnh quá lớn (tối đa 12 MB).'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('Không xử lý được ảnh.')) }
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh.')) }
    img.src = url
  })
}
