import type HanziWriter from 'hanzi-writer'

let cache: Promise<Record<string, unknown>> | null = null

function loadMap(): Promise<Record<string, unknown>> {
  if (!cache) {
    cache = (__SINGLE__
      ? import('../data/inlineData').then((m) => m.strokes as Record<string, unknown>)
      : fetch(`${import.meta.env.BASE_URL}data/strokes.json`).then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : {}))
    ).catch(() => ({}))
  }
  return cache
}

/** Tải dữ liệu nét: ưu tiên file đi kèm web (chạy offline), thiếu chữ nào mới hỏi CDN (nếu không phải bản một file). */
export function strokeLoader(char: string, onLoad: (d: any) => void, onError: (e?: unknown) => void) {
  void loadMap().then(async (m) => {
    if (m[char]) return onLoad(m[char])
    if (__SINGLE__) return onError()
    try {
      const r = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(char)}.json`)
      if (!r.ok) throw new Error('no data')
      onLoad(await r.json())
    } catch (e) { onError(e) }
  })
}
