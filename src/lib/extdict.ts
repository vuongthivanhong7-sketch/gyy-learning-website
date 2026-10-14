/**
 * Từ điển mở rộng để tra chữ Hán ngoài 99 mục GYY. Nguồn: CC-CEDICT (MDBG), giấy phép CC BY-SA 4.0.
 * Dữ liệu chia theo chữ đầu của từ giản thể (public/data/dict/<mã chữ>.json); trình duyệt chỉ tải đúng phần cần dùng.
 */
export interface ExtEntry { s: string; p: string; d: string[] }
export interface ExtMeta { name: string; publisher: string; license: string; licenseUrl: string; url: string; date: string | null; entries: number }

const TONES: Record<string, string> = { a: 'āáǎàa', e: 'ēéěèe', i: 'īíǐìi', o: 'ōóǒòo', u: 'ūúǔùu', ü: 'ǖǘǚǜü' }
/** Đổi pinyin số thanh của CC-CEDICT (xue2 xiao4, lu:4) sang pinyin có dấu thanh. */
export function pinyinMarks(py: string): string {
  return py.split(' ').map((syl) => {
    const m = /^([A-Za-z:]+?)([1-5])?$/.exec(syl)
    if (!m) return syl
    const base = m[1].replace(/u:/g, 'ü').replace(/U:/g, 'Ü')
    const tone = m[2] ? Number(m[2]) : 5
    if (tone === 5) return base
    const lower = base.toLowerCase()
    let idx = lower.search(/[ae]/)
    if (idx < 0 && lower.includes('ou')) idx = lower.indexOf('o')
    if (idx < 0) for (let i = lower.length - 1; i >= 0; i--) if ('aeiouü'.includes(lower[i])) { idx = i; break }
    if (idx < 0) return base
    const marked = TONES[lower[idx]][tone - 1]
    return base.slice(0, idx) + (base[idx] !== lower[idx] ? marked.toUpperCase() : marked) + base.slice(idx + 1)
  }).join(' ')
}

/** Tệp chứa chữ này: các chữ đầu có mã chữ trong cùng một nhóm 32 mã nằm chung một tệp (b<hex>.json). */
export const bucketOf = (ch: string) => 'b' + Math.floor(ch.codePointAt(0)! / 32).toString(16)
const cache = new Map<string, Promise<ExtEntry[] | null>>()

/** null = không tải được nguồn (khác với "không có mục"). */
export function loadShard(ch: string, base = import.meta.env.BASE_URL): Promise<ExtEntry[] | null> {
  const k = bucketOf(ch)
  if (typeof __SINGLE__ !== 'undefined' && __SINGLE__) {
    // Bản một file: dữ liệu nằm sẵn trong trang (nén gzip), không cần mạng.
    return import('../data/dictInline').then((m) => m.bucket(k.slice(1))).then((rows) => (rows === null ? null : rows.map(([s, p, d]) => ({ s, p, d })))).catch(() => null)
  }
  if (!cache.has(k)) {
    cache.set(k, fetch(`${base}data/dict/${k}.json`).then(async (r) => {
      if (r.status === 404 || !(r.headers.get('content-type') ?? '').includes('json')) return [] // chữ này không có mục nào
      if (!r.ok) return null
      return ((await r.json()) as [string, string, string[]][]).map(([s, p, d]) => ({ s, p, d }))
    }).catch(() => null))
    cache.get(k)!.then((v) => { if (v === null) cache.delete(k) })
  }
  return cache.get(k)!
}

export async function lookupExt(term: string): Promise<{ status: 'ok' | 'unavailable'; entries: ExtEntry[] }> {
  const rows = await loadShard(Array.from(term)[0])
  if (rows === null) return { status: 'unavailable', entries: [] }
  return { status: 'ok', entries: rows.filter((r) => r.s === term) }
}
export async function suggestExt(prefix: string, limit = 6): Promise<ExtEntry[]> {
  const rows = await loadShard(Array.from(prefix)[0])
  return (rows ?? []).filter((r) => r.s.startsWith(prefix) && r.s !== prefix).slice(0, limit)
}

/** CC-CEDICT gắn "(idiom)" cho các cụm cố định/thành ngữ. Đây KHÔNG phải nhãn 惯用语. */
export const isIdiomTagged = (entries: ExtEntry[]) => entries.some((e) => e.d.some((x) => /\(idiom\)/.test(x)))
/** Tách phần nghĩa đen / nghĩa bóng theo cách CC-CEDICT ghi (lit. / fig.). Chỉ lấy những gì nguồn ghi, không suy đoán. */
export function splitSenses(defs: string[]): { literal: string[]; figurative: string[]; other: string[] } {
  const literal: string[] = [], figurative: string[] = [], other: string[] = []
  for (const d of defs) (/^\(?lit\./i.test(d) || /\blit\. /.test(d) ? literal : /^\(?fig\./i.test(d) || /\bfig\. /.test(d) ? figurative : other).push(d)
  return { literal, figurative, other }
}
