export interface IdiomExample {
  zh: string
  pinyin?: string
  vi?: string
  /** Tên sách/tài liệu của CÂU VÍ DỤ (có thể khác nguồn của Quán dụng ngữ). */
  source?: string
}

/** Một lần Quán dụng ngữ xuất hiện trong một cuốn sách/đề (theo từng sheet của file dữ liệu). */
export interface Occurrence {
  source: string
  exam?: string
  question?: string
  page?: string
  quote?: string
}

export interface ImageCredit {
  sourceUrl?: string
  author?: string
  license?: string
  note?: string
}

export type VerifyStatus = 'verified' | 'preliminary' | 'undetermined' | 'not_found' | 'no_data'

export interface Idiom {
  id: string
  hanzi: string
  pinyin: string
  meaningVi: string
  /** Nghĩa tiếng Anh / tiếng Trung nếu dữ liệu có (không tự bịa). */
  meaningEn?: string
  meaningZh?: string
  literal?: string
  figurative?: string
  examples: IdiomExample[]
  /** Nguồn của Quán dụng ngữ (không phải của câu ví dụ). */
  source?: string
  topic?: string
  image?: string
  imageCredit?: ImageCredit
  /** Một Quán dụng ngữ có thể thuộc nhiều chủ đề. `topic` là trường cũ (một chủ đề). */
  topics?: string[]
  /** 'lookup' = lưu từ Tra cứu chung (không thuộc kho HSK 5 của GYY). */
  origin?: 'user' | 'lookup'
  verification?: VerifyStatus
  audio?: string
  examContext?: string
  /** Các lần xuất hiện trong sách/đề, mỗi lần gắn với tên sách (tên sheet). */
  occurrences?: Occurrence[]
  /** Trường được tạo tự động khi nạp dữ liệu (vd. pinyin). */
  autoFields?: string[]
  note?: string
  /** true = do người dùng tự nhập, không phải ngữ liệu HSK 5. */
  custom?: boolean
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface SrsState {
  ease: number
  intervalMin: number
  reps: number
  lapses: number
  dueAt: string
  lastReviewedAt?: string
}

export interface Progress {
  idiomId: string
  saved: boolean
  savedAt?: string
  note?: string
  /** Bốn bước: flashcard, viết chữ, gõ từ, trắc nghiệm. */
  stepsDone: boolean[]
  stepResults: { write?: boolean; type?: boolean; quiz?: boolean }
  learnedAt?: string
  /** Lần cuối người học làm một bước của bài (dùng cho "Tiếp tục học"). */
  lastStudiedAt?: string
  srs?: SrsState
}

export interface CustomIdiom extends Idiom {
  custom: true
  createdAt: string
}

export interface Activity {
  ts: string
  /** 'bonus' = thưởng nhiệm vụ; không tính là ngày học cho streak/heatmap. */
  kind: 'learn' | 'review' | 'exercise' | 'bonus'
  points: number
  idiomId?: string
  /** Khóa chống ghi trùng: học xong một bài (idiomId) hoặc nhận thưởng nhiệm vụ (ngày + mã nhiệm vụ). */
  ref?: string
  correct?: boolean
}

/** 'sentence' = Sắp xếp câu; 'mixed' = kết hợp năm dạng. */
export type ExerciseType = 'pairs' | 'match' | 'choice' | 'sentence' | 'cloze' | 'mixed'

export interface ExerciseRun {
  id: string
  ts: string
  type: ExerciseType
  total: number
  correct: number
  topic?: string
  idiomIds: string[]
}

export interface Prefs {
  /** Số Quán dụng ngữ mới muốn học mỗi ngày. */
  dailyNew: number
  /** Số mục đến hạn muốn ôn mỗi ngày. */
  dailyReview: number
  notifyDue: boolean
  notifyDaily: boolean
  lang?: 'vi' | 'zh' | 'en'
  musicOn: boolean
  musicVol: number
  sfxOn: boolean
  sfxVol: number
  /** Giọng đọc tiếng Trung: mặc định thiết bị, nữ hoặc nam. */
  voice?: 'default' | 'female' | 'male'
  voiceRate?: number
}
export const defaultPrefs = (): Prefs => ({ dailyNew: 5, dailyReview: 10, notifyDue: true, notifyDaily: true, musicOn: false, musicVol: 0.35, sfxOn: true, sfxVol: 0.6 })

export interface SentenceRecord {
  id: string
  ts: string
  idiomId: string
  text: string
  score: number
  feedback?: unknown
}

export interface UserState {
  progress: Record<string, Progress>
  custom: CustomIdiom[]
  activity: Activity[]
  runs: ExerciseRun[]
  prefs: Prefs
  /** Nhiệm vụ đã nhận XP, theo ngày (YYYY-MM-DD giờ VN) → danh sách mã nhiệm vụ. */
  claims: Record<string, string[]>
  /** Câu người học đã viết ở bài "Đặt câu" kèm điểm và nhận xét (tối đa 60 gần nhất). */
  sentences: SentenceRecord[]
}

export const emptyUserState = (): UserState => ({ progress: {}, custom: [], activity: [], runs: [], prefs: defaultPrefs(), claims: {}, sentences: [] })

export const newProgress = (idiomId: string): Progress => ({
  idiomId,
  saved: false,
  stepsDone: [false, false, false, false],
  stepResults: {},
})

/** Danh sách sách/tài liệu nguồn của một Quán dụng ngữ. */
export const idiomSources = (i: Idiom): string[] => [...new Set([i.source, ...(i.occurrences ?? []).map((o) => o.source)].filter((x): x is string => !!x))]

export const idiomTopics = (i: Idiom): string[] => (i.topics && i.topics.length ? i.topics : i.topic ? [i.topic] : [])
