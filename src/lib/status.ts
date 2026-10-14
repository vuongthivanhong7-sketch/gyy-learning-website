import type { Progress } from '../types'

/**
 * Định nghĩa trạng thái học (tách biệt với "đã lưu"):
 * - Chưa học: chưa hoàn thành bước nào của bài học.
 * - Đang học: đã hoàn thành ít nhất một bước nhưng chưa xong cả bốn.
 * - Đã học: hoàn thành đủ bốn bước (Flashcard, Viết chữ, Gõ từ, Trắc nghiệm).
 * Chỉ mở thẻ, đọc nghĩa, lưu vào sổ tay hay làm bài luyện tập KHÔNG làm Quán dụng ngữ thành "đã học".
 */
export type LearnStatus = 'new' | 'learning' | 'learned'
export const learnStatus = (p?: Progress): LearnStatus => (p?.learnedAt ? 'learned' : p?.stepsDone?.some(Boolean) ? 'learning' : 'new')
export const isDueProgress = (p?: Progress, now = new Date()) => !!p?.srs && new Date(p.srs.dueAt) <= now
export const STATUS_LABEL: Record<LearnStatus, string> = { new: 'Chưa học', learning: 'Đang học', learned: 'Đã học' }
