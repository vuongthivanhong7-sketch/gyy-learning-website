/** Kho lưu trữ nhỏ trong trình duyệt (IndexedDB, dự phòng localStorage). Dùng cho ảnh và dữ liệu quản trị. */
const DB = 'gyy-admin'
const STORE = 'kv'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no idb'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await open()
    return await new Promise<T | undefined>((resolve, reject) => {
      const r = db.transaction(STORE).objectStore(STORE).get(key)
      r.onsuccess = () => resolve(r.result as T | undefined)
      r.onerror = () => reject(r.error)
    })
  } catch {
    try { const s = localStorage.getItem(`gyy:kv:${key}`); return s ? (JSON.parse(s) as T) : undefined } catch { return undefined }
  }
}

export async function kvSet(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch {
    try { localStorage.setItem(`gyy:kv:${key}`, JSON.stringify(value)); return true } catch { return false }
  }
}
