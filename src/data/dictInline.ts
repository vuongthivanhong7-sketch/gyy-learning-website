// Chỉ dùng cho bản build một file (build:single): từ điển CC-CEDICT được nén gzip và nhúng sẵn trong trang.
import b64 from './dictBundle'
import metaFile from '../../public/data/dict/_meta.json'

type Rows = [string, string, string[]][]
let loaded: Promise<Record<string, Rows> | null> | null = null

async function load(): Promise<Record<string, Rows> | null> {
  try {
    if (typeof DecompressionStream === 'undefined') return null
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return (await new Response(stream).json()) as Record<string, Rows>
  } catch { return null }
}
/** Trả về các mục của một nhóm chữ (null nếu không giải nén được). */
export async function bucket(hex: string): Promise<Rows | null> {
  loaded ??= load()
  const all = await loaded
  return all ? (all[hex] ?? []) : null
}
export const meta = metaFile
