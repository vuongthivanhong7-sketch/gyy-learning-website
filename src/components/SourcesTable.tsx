import { ACCESS_LABEL, RESULT_LABEL, type SourceRef, type VerifyEntry } from '../lib/verify'

/** Bảng đối chiếu từng tài liệu tham chiếu cho một cụm từ: trạng thái, nhãn, trang, trích mục từ. */
export function SourcesTable({ sources, entry }: { sources: SourceRef[]; entry?: VerifyEntry }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {sources.map((s) => {
        const r = entry?.results.find((x) => x.sourceId === s.id)
        const st = r?.status ?? 'not_checked'
        return (
          <li key={s.id} className="rounded-2xl border border-line p-3 text-sm">
            <p className="han font-bold [overflow-wrap:anywhere]">{s.name}</p>
            <p className="text-muted">{ACCESS_LABEL[s.access]}</p>
            <p className={`mt-1 font-bold ${st === 'confirmed' ? 'text-ok' : st === 'not_checked' ? 'text-muted' : ''}`}>{RESULT_LABEL[st]}</p>
            {r && st !== 'not_checked' && (
              <dl className="mt-1 grid gap-x-3 gap-y-0.5 sm:grid-cols-[8rem_1fr]">
                {r.labels?.length ? <><dt className="text-muted">Nhãn phân loại</dt><dd className="han">{r.labels.join('、')}</dd></> : null}
                {r.entryNo ? <><dt className="text-muted">Số mục từ</dt><dd>{r.entryNo}</dd></> : null}
                {r.page ? <><dt className="text-muted">Trang</dt><dd>{r.page}</dd></> : null}
                {r.quote ? <><dt className="text-muted">Mục từ</dt><dd className="han [overflow-wrap:anywhere]">{r.quote}</dd></> : null}
                {r.url ? <><dt className="text-muted">Đường dẫn</dt><dd className="break-all"><a className="text-brand-strong underline" href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a></dd></> : null}
                {r.checker || r.checkedAt ? <><dt className="text-muted">Kiểm chứng</dt><dd>{[r.checker, r.checkedAt].filter(Boolean).join(' · ')}</dd></> : null}
                {r.note ? <><dt className="text-muted">Ghi chú</dt><dd>{r.note}</dd></> : null}
              </dl>
            )}
          </li>
        )
      })}
      {sources.length === 0 && <li className="text-muted">Chưa có danh sách tài liệu tham chiếu.</li>}
    </ul>
  )
}
