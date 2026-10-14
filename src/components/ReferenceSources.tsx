import type { SourceRef, VerifyEntry } from '../lib/verify'
import { useI18n } from '../i18n'

/** Nguồn tham khảo gọn cho người học: chỉ liệt kê tài liệu thực sự có mục từ. Không hiện cảnh báo nội bộ. */
export function ReferenceSources({ sources, entry }: { sources: SourceRef[]; entry?: VerifyEntry }) {
  const { t: tr } = useI18n()
  const rows = (entry?.results ?? []).filter((r) => r.status === 'confirmed' || r.status === 'found_other_label' || r.status === 'preliminary')
  if (rows.length === 0) return null
  return (
    <div className="rounded-2xl border border-line p-3 text-sm">
      <p className="font-extrabold">{tr('Nguồn tham khảo')}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {rows.map((r) => {
          const s = sources.find((x) => x.id === r.sourceId)
          const lab = r.labels?.length ? ` · 〈${r.labels.join('、')}〉` : ''
          return <li key={r.sourceId} className="han [overflow-wrap:anywhere]">{s?.short ?? r.sourceId}{lab}{r.page ? ` · ${r.page}` : ''}{r.url && /^https?:\/\//i.test(r.url) ? <> · <a className="underline" href={r.url} target="_blank" rel="noopener noreferrer">{tr('Mở nguồn')}</a></> : null}</li>
        })}
      </ul>
    </div>
  )
}
