import type { SourceResult } from './verify'
import { termKey } from './verify'

/** Chỉ mục tiêu đề mục từ của 3 từ điển, tạo bằng OCR từ bản PDF quét do chủ dự án cung cấp. */
export type DictId = 'xd' | 'ys' | 'cy'
export interface DictEntry { d: DictId; t: string; l?: string; p: number; pp?: string }
export interface DictIndex { generatedAt: string; entries: DictEntry[]; pages: Record<DictId, number> }

export const DICT_SOURCE_ID: Record<DictId, string> = { xd: 'xdhy-gyycd', ys: 'ysgy-cd', cy: 'cygy-cd' }
const ORDER: DictId[] = ['xd', 'cy', 'ys']

/** Chuẩn hóa để so khớp: chỉ chữ Hán, bỏ 儿 (hóa âm cuối không ảnh hưởng tư cách mục từ). */
const norm = (s: string) => termKey(s).replace(/儿/g, '')
const parts = (t: string) => [...new Set([norm(t), ...t.split(/[，,、；;／/]/).map(norm)].filter((x) => x.length >= 2))]

export interface Compiled { byKey: Map<string, DictEntry[]>; list: { e: DictEntry; keys: string[] }[] }
export function compile(index: DictIndex): Compiled {
  const byKey = new Map<string, DictEntry[]>()
  const list = index.entries.map((e) => ({ e, keys: parts(e.t) }))
  for (const { e, keys } of list) for (const k of keys) { const a = byKey.get(k); a ? a.push(e) : byKey.set(k, [e]) }
  return { byKey, list }
}

/** Khớp gần đúng (lệch đúng một chữ, cùng độ dài ≥ 4): có thể do lỗi nhận diện OCR. */
function near(c: Compiled, key: string): DictEntry[] {
  if (key.length < 4) return []
  const out: DictEntry[] = []
  for (const { e, keys } of c.list) {
    for (const k of keys) {
      if (k.length !== key.length) continue
      let diff = 0
      for (let i = 0; i < k.length && diff < 2; i++) if (k[i] !== key[i]) diff++
      if (diff === 1) { out.push(e); break }
    }
    if (out.length >= 6) break
  }
  return out
}

const pageText = (e: DictEntry) => `${e.pp ? `tr. ${e.pp} (trang PDF ${e.p})` : `trang PDF ${e.p}`}`
const OCR_NOTE = 'Nhận diện bằng OCR từ bản quét PDF.'

/** Đối chiếu một cụm từ với chỉ mục, trả về một kết quả cho mỗi từ điển. */
export function dictResults(index: DictIndex, c: Compiled, term: string): SourceResult[] {
  const key = norm(term)
  if (key.length < 2) return []
  const out: SourceResult[] = []
  for (const d of ORDER) {
    const sourceId = DICT_SOURCE_ID[d]
    const base = { sourceId, checker: 'GYY (OCR bản PDF)', checkedAt: index.generatedAt.slice(0, 10) }
    const exact = (c.byKey.get(key) ?? []).filter((e) => e.d === d)
    if (exact.length) {
      const e = exact[0]
      const pagesAll = exact.map(pageText).join('; ')
      const quote = `Mục từ: ${e.t}`
      if (d === 'ys') {
        const l = exact.find((x) => x.l)?.l
        if (l === '惯') out.push({ ...base, status: 'confirmed', labels: ['惯用语'], page: pagesAll, quote, note: `Nhãn 〈惯〉 trong từ điển. ${OCR_NOTE}` })
        else if (l === '俗' || l === '谚') out.push({ ...base, status: 'found_other_label', labels: [l === '俗' ? '俗语' : '谚语'], page: pagesAll, quote, note: `Nhãn 〈${l}〉 trong từ điển. ${OCR_NOTE}` })
        else out.push({ ...base, status: 'preliminary', page: pagesAll, quote, note: `Có mục từ nhưng không đọc được nhãn phân loại (〈谚〉〈俗〉〈惯〉). Cần xem bản gốc. ${OCR_NOTE}` })
      } else {
        out.push({ ...base, status: 'confirmed', labels: ['惯用语'], page: pagesAll, quote, note: `Mục từ trong từ điển chuyên về 惯用语 (không có nhãn riêng cho từng mục). ${OCR_NOTE}` })
      }
      continue
    }
    const n = near(c, key).filter((e) => e.d === d)
    if (n.length) out.push({ ...base, status: 'preliminary', page: n.map(pageText).join('; '), quote: `Khớp gần đúng: ${n.map((e) => e.t).join(' | ')}`, note: `Chỉ khác một chữ, có thể do lỗi OCR hoặc là dị bản. Cần xem bản gốc. ${OCR_NOTE}` })
    else out.push({ ...base, status: 'not_found', note: `Không thấy trong chỉ mục tiêu đề mục từ (${index.pages[d]} trang đã đọc). Chỉ mục tạo bằng OCR nên có thể sót.` })
  }
  return out
}
