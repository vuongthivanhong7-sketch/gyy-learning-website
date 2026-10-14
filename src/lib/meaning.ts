import { useI18n } from '../i18n'
import type { Idiom } from '../types'

/** Nghĩa theo ngôn ngữ giao diện; thiếu thì dùng tiếng Việt (không tự dịch). */
export function useMeaning() {
  const { lang } = useI18n()
  return (i: Idiom): { text: string; fallback: boolean } => {
    if (lang === 'en' && i.meaningEn) return { text: i.meaningEn, fallback: false }
    if (lang === 'zh' && i.meaningZh) return { text: i.meaningZh, fallback: false }
    return { text: i.meaningVi, fallback: lang !== 'vi' }
  }
}
