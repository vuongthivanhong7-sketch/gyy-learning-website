import { createContext, createElement, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { zh } from './zh'
import { en } from './en'

export type Lang = 'vi' | 'zh' | 'en'
export const LANGS: { code: Lang; label: string; locale: string; html: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', locale: 'vi-VN', html: 'vi' },
  { code: 'zh', label: '中文（简体）', locale: 'zh-CN', html: 'zh-CN' },
  { code: 'en', label: 'English', locale: 'en-US', html: 'en' },
]
const KEY = 'gyy:lang'
const DICT: Record<Lang, Record<string, string>> = { vi: {}, zh, en }

/** Khóa dịch là câu tiếng Việt gốc; bộ dịch riêng cho từng ngôn ngữ nằm ở zh.ts và en.ts. Thiếu bản dịch thì dùng tiếng Việt và ghi nhận để rà soát. */
const missing = new Set<string>()
if (typeof window !== 'undefined') (window as unknown as { __i18nMissing: Set<string> }).__i18nMissing = missing

function fill(tpl: string, args?: unknown[]): string {
  return args ? tpl.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? '')) : tpl
}

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  locale: string
  /** Dịch một chuỗi (có thể có {0}, {1}…). */
  t: (key: string, args?: unknown[]) => string
  /** Như t, nhưng đối số có thể là phần tử React. */
  tx: (key: string, args?: unknown[]) => ReactNode
}
const C = createContext<Ctx | null>(null)

const initial = (): Lang => {
  try { const s = localStorage.getItem(KEY); if (s === 'vi' || s === 'zh' || s === 'en') return s } catch { /* bỏ qua */ }
  return 'vi'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  const meta = LANGS.find((l) => l.code === lang)!
  useEffect(() => { document.documentElement.lang = meta.html }, [meta.html])
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem(KEY, l) } catch { /* bỏ qua */ } }, [])
  const value = useMemo<Ctx>(() => {
    const raw = (key: string) => {
      if (lang === 'vi') return key
      const v = DICT[lang][key]
      if (v === undefined) { missing.add(key); return key }
      return v
    }
    return {
      lang, setLang, locale: meta.locale,
      t: (key, args) => fill(raw(key), args),
      tx: (key, args) => {
        const tpl = raw(key)
        if (!args || !args.some((a) => typeof a === 'object' && a !== null)) return fill(tpl, args)
        const parts = tpl.split(/(\{\d+\})/g)
        return createElement(Fragment, null, ...parts.map((p, i) => { const m = /^\{(\d+)\}$/.exec(p); return m ? createElement(Fragment, { key: i }, args[Number(m[1])] as ReactNode) : p }))
      },
    }
  }, [lang, setLang, meta.locale])
  return <C.Provider value={value}>{children}</C.Provider>
}

export const useI18n = () => { const v = useContext(C); if (!v) throw new Error('I18nProvider missing'); return v }
