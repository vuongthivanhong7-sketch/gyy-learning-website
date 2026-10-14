import { Check } from 'lucide-react'
import { useI18n } from '../i18n'

export const STEP_LABELS = ['Flashcard', 'Viết chữ', 'Gõ từ', 'Trắc nghiệm']

/** Thanh tiến trình 4 bước. Có padding trên/dưới và không cắt vòng tròn (không dùng overflow-hidden). */
export function Steps({ current, done, onGo }: { current: number; done: boolean[]; onGo?: (i: number) => void }) {
  const { t: tr } = useI18n()
  return (
    <ol className="flex items-start px-1 pb-2 pt-3" aria-label={tr("Bốn bước học")}>
      {STEP_LABELS.map((label, i) => {
        const isDone = done[i] && i !== current
        const active = i === current
        const canGo = !!onGo && (done[i] || i <= current)
        return (
          <li key={label} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={`absolute left-[-50%] right-[50%] top-[19px] h-1 rounded-full ${done[i - 1] ? 'bg-ok' : 'bg-line'}`} />}
            <button type="button" disabled={!canGo} onClick={() => onGo?.(i)}
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold transition ${active ? 'bg-brand text-on-brand ring-4 ring-brand/25 ' : isDone ? 'bg-ok text-white' : 'border-2 border-line bg-card text-muted'}`}
              aria-label={tr("Bước {0}: {1}{2}", [i + 1, tr(label), isDone ? tr(" (đã xong)") : active ? tr(" (đang học)") : ''])}>
              {isDone ? <Check size={20} strokeWidth={3} /> : i + 1}
            </button>
            <span className={`w-full px-0.5 text-center text-[13px] font-bold leading-tight sm:text-sm ${active ? 'text-brand-strong' : 'text-muted'}`}>{tr(label)}</span>
          </li>
        )
      })}
    </ol>
  )
}
