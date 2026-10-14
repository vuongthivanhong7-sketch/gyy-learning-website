import { useMemo } from 'react'
import { useIdioms } from '../data/IdiomsContext'
import { resolveIdiom, useUserData } from '../store/UserData'

/** Bài học để "Tiếp tục học": bài đang dở gần nhất; nếu không có thì Quán dụng ngữ chưa học đầu tiên trong kho. */
export function useResume() {
  const { idioms } = useIdioms()
  const ud = useUserData()
  return useMemo(() => {
    const inProgress = Object.values(ud.state.progress).filter((p) => !p.learnedAt && p.stepsDone?.some(Boolean) && resolveIdiom(idioms, [], p.idiomId)).sort((a, b) => (b.lastStudiedAt ?? '').localeCompare(a.lastStudiedAt ?? ''))[0]
    const idiom = (inProgress && resolveIdiom(idioms, [], inProgress.idiomId)) || idioms.find((i) => !ud.isLearned(i.id))
    return { idiom, started: !!inProgress, allDone: idioms.length > 0 && !inProgress && !idioms.some((i) => !ud.isLearned(i.id)), progress: idiom ? ud.progressOf(idiom.id) : undefined }
  }, [idioms, ud])
}
