import type { Evaluation } from './verify'
import { isIdiomTagged, type ExtEntry } from './extdict'

/**
 * Phân loại Quán dụng ngữ (惯用语) dựa trên bằng chứng từ nguồn, KHÔNG dùng danh sách 99 mục GYY để phân loại:
 *  A: có căn cứ xác nhận 惯用语 (từ điển chuyên ngành đã tích hợp hoặc hồ sơ kiểm chứng của quản trị viên);
 *  B: có căn cứ xác định thuộc loại khác (nhãn 谚/俗 trong từ điển chuyên ngành, hoặc CC-CEDICT đánh dấu cụm cố định/idiom) mà chưa có xác nhận 惯用语;
 *  C: chưa đủ dữ liệu để xác định (không suy đoán có hoặc không).
 * "Idiom" của CC-CEDICT không đồng nghĩa với 惯用语 và 成语 không đồng nhất với 惯用语.
 */
export type ClassState = 'A' | 'B' | 'C'
export interface Classification { state: ClassState; confirmedBy: string[]; otherLabels: string[]; cedictIdiom: boolean }

export function classify(ev: Evaluation, ext: ExtEntry[]): Classification {
  const cedictIdiom = isIdiomTagged(ext)
  const base = { confirmedBy: ev.confirmedBy, otherLabels: ev.otherLabels, cedictIdiom }
  if (ev.state === 'verified') return { state: 'A', ...base }
  if (ev.state === 'undetermined' || cedictIdiom) return { state: 'B', ...base }
  return { state: 'C', ...base }
}
