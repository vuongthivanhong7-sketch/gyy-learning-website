import type { Idiom, IdiomExample } from '../types'

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('zh', { granularity: 'word' }) : null
const isPunct = (s: string) => /^[\p{P}\p{S}\s]+$/u.test(s)

function words(s: string): string[] {
  if (!s) return []
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s)
}

/** Tách câu thành các cụm để sắp xếp. Giữ nguyên Quán dụng ngữ thành một cụm; dấu câu dính vào cụm đứng trước. */
export function chunkSentence(zh: string, idiom?: string, max = 8): string[] | null {
  let tokens: string[]
  const at = idiom ? zh.indexOf(idiom) : -1
  if (idiom && at >= 0) tokens = [...words(zh.slice(0, at)), idiom, ...words(zh.slice(at + idiom.length))]
  else tokens = words(zh)

  const merged: string[] = []
  let lead = ''
  for (const t of tokens) {
    if (isPunct(t)) { if (merged.length) merged[merged.length - 1] += t; else lead += t } else { merged.push(lead + t); lead = '' }
  }
  if (lead && merged.length) merged[0] = lead + merged[0]
  // Gộp các cặp ngắn nhất cho tới khi đủ số cụm hợp lý
  while (merged.length > max) {
    let best = 0, bestLen = Infinity
    for (let k = 0; k < merged.length - 1; k++) {
      const len = merged[k].length + merged[k + 1].length
      if (len < bestLen) { bestLen = len; best = k }
    }
    merged.splice(best, 2, merged[best] + merged[best + 1])
  }
  return merged.length >= 3 ? merged : null
}

const cache = new Map<string, { chunks: string[]; ex: IdiomExample } | null>()
/** Chọn câu ví dụ đầu tiên đủ dài để xếp (ít nhất 3 cụm). */
export function orderPuzzle(i: Idiom): { chunks: string[]; ex: IdiomExample } | null {
  const key = i.id + '|' + i.examples.map((e) => e.zh).join('|')
  if (cache.has(key)) return cache.get(key)!
  let res: { chunks: string[]; ex: IdiomExample } | null = null
  for (const ex of i.examples) {
    const chunks = chunkSentence(ex.zh, i.hanzi)
    if (chunks && chunks.join('') === ex.zh) { res = { chunks, ex }; break }
  }
  cache.set(key, res)
  return res
}
