const HAN = /\p{Script=Han}/u

export const isHan = (ch: string) => HAN.test(ch)
export const hanChars = (s: string) => Array.from(s).filter(isHan)

/** Bỏ dấu thanh, số thanh, khoảng trắng; v = ü. Dùng để so pinyin không dấu. */
export function normalizePinyin(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ü/g, 'u')
    .replace(/v/g, 'u')
    .replace(/[0-5\s'’\-·.,，。…~]/g, '')
}

/** Bỏ dấu tiếng Việt để tìm kiếm không dấu. */
export function normalizeVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

/** Kiểm tra đáp án gõ từ: chữ Hán hoặc pinyin (không cần dấu thanh). */
export function matchesTyped(input: string, hanzi: string, pinyin: string): boolean {
  const t = input.trim()
  if (!t) return false
  if (Array.from(t).some(isHan)) return hanChars(t).join('') === hanChars(hanzi).join('')
  const a = normalizePinyin(t)
  return a.length > 0 && a === normalizePinyin(pinyin)
}

/** Đáp án câu "đặt câu": câu có chứa Quán dụng ngữ không (kiểm tra thật, không phải AI). */
export function sentenceContains(sentence: string, hanzi: string): boolean {
  return hanChars(sentence).join('').includes(hanChars(hanzi).join(''))
}
