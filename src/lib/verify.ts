import type { VerifyStatus } from '../types'
import { hanChars } from './text'

/** Bốn tài liệu tham chiếu để kiểm tra tư cách Quán dụng ngữ (惯用语). */
export interface SourceRef { id: string; name: string; short: string; access: 'not_accessible' | 'partial' | 'manual' | 'indexed' }

export type ResultStatus = 'confirmed' | 'found_other_label' | 'not_found' | 'preliminary' | 'not_checked'
export const RESULT_LABEL: Record<ResultStatus, string> = {
  confirmed: 'Xác nhận là 惯用语',
  found_other_label: 'Có mục từ nhưng nhãn khác (chưa xác nhận 惯用语)',
  not_found: 'Đã kiểm tra, không thấy mục từ',
  preliminary: 'Kết quả sơ bộ (chưa kiểm tra tài liệu gốc)',
  not_checked: 'Chưa kiểm tra',
}

export interface SourceResult {
  sourceId: string
  status: ResultStatus
  /** Nhãn phân loại trong tài liệu, ví dụ 惯用语, 成语, 谚语, 俗语. */
  labels?: string[]
  entryNo?: string
  page?: string
  quote?: string
  meaning?: string
  example?: string
  url?: string
  checkedAt?: string
  checker?: string
  note?: string
}
export interface VerifyEntry {
  term: string
  pinyin?: string
  literal?: string
  results: SourceResult[]
  approval?: 'pending' | 'approved' | 'rejected'
  note?: string
  updatedAt?: string
}
export interface VerifyFile { updatedAt: string | null; sources: SourceRef[]; entries: VerifyEntry[] }

export const VSTATE_LABEL: Record<VerifyStatus, string> = {
  verified: 'Đã xác minh là Quán dụng ngữ',
  preliminary: 'Cần kiểm chứng thêm',
  undetermined: 'Chưa xác định',
  not_found: 'Chưa tìm thấy trong các nguồn đã kiểm tra',
  no_data: 'Chưa có dữ liệu kiểm chứng',
}
export const VBADGE: Record<VerifyStatus, string> = {
  verified: 'Đã xác minh', preliminary: 'Cần kiểm chứng thêm', undetermined: 'Chưa xác định', not_found: 'Chưa tìm thấy trong nguồn đã kiểm tra', no_data: 'Chưa xác minh',
}
export const ACCESS_LABEL: Record<SourceRef['access'], string> = {
  not_accessible: 'GYY chưa truy cập được toàn văn',
  partial: 'Truy cập một phần',
  manual: 'Kiểm tra thủ công bởi quản trị viên',
  indexed: 'Đã lập chỉ mục tiêu đề mục từ bằng OCR từ bản PDF do bạn cung cấp',
}

export const termKey = (s: string) => hanChars(s).join('')

export interface Evaluation {
  state: VerifyStatus
  /** Tài liệu xác nhận là 惯用语. */
  confirmedBy: string[]
  /** Nhãn phân loại khác ghi nhận ở các nguồn (成语, 谚语, 俗语…). */
  otherLabels: string[]
  checkedIds: string[]
}

/**
 * Quy tắc quyết định:
 * 1. Có ít nhất một nguồn xác nhận 惯用语 → "Đã xác minh", kể cả khi nguồn khác xếp vào 成语/谚语/俗语.
 * 2. Chỉ có kết quả sơ bộ → "Cần kiểm chứng thêm".
 * 3. Chỉ có mục từ với nhãn khác (chưa ai xác nhận 惯用语) → "Chưa xác định" (không khẳng định "không phải").
 * 4. Đã kiểm tra mà không thấy → "Chưa tìm thấy trong các nguồn đã kiểm tra" (không kết luận tuyệt đối).
 * 5. Không có dữ liệu nào → "Chưa có dữ liệu kiểm chứng".
 */
export function evaluate(entry?: VerifyEntry): Evaluation {
  const rs = (entry?.results ?? []).filter((r) => r.status !== 'not_checked')
  const confirmedBy = rs.filter((r) => r.status === 'confirmed').map((r) => r.sourceId)
  const otherLabels = [...new Set(rs.flatMap((r) => r.labels ?? []).filter((l) => l !== '惯用语'))]
  const checkedIds = rs.filter((r) => r.status !== 'preliminary').map((r) => r.sourceId)
  let state: VerifyStatus
  if (confirmedBy.length) state = 'verified'
  else if (rs.some((r) => r.status === 'preliminary')) state = 'preliminary'
  else if (rs.some((r) => r.status === 'found_other_label')) state = 'undetermined'
  else if (rs.some((r) => r.status === 'not_found')) state = 'not_found'
  else state = 'no_data'
  return { state, confirmedBy, otherLabels, checkedIds }
}
