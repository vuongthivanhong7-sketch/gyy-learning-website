import { isHan, normalizePinyin, normalizeVi } from './text'
import type { Idiom } from '../types'

/** Tìm theo chữ Hán, pinyin (có/không dấu thanh), nghĩa tiếng Việt và nghĩa tiếng Anh/Trung nếu dữ liệu có. */
export function matchIdiom(i: Idiom, q: string): boolean {
  const t = q.trim()
  if (!t) return true
  if (Array.from(t).some(isHan)) return i.hanzi.includes(t) || (i.meaningZh ?? '').includes(t)
  const py = normalizePinyin(t)
  if (py.length > 0 && normalizePinyin(i.pinyin).includes(py)) return true
  const vi = normalizeVi(t)
  return normalizeVi(i.meaningVi).includes(vi) || (!!i.meaningEn && i.meaningEn.toLowerCase().includes(t.toLowerCase()))
}
