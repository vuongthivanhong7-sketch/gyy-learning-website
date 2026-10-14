import { Link } from 'react-router-dom'
import { ArrowRight, Bell } from 'lucide-react'
import { useIdioms } from '../data/IdiomsContext'
import { useUserData } from '../store/UserData'
import { useAuth } from '../store/AuthContext'
import { AddButton, DemoBanner, EmptyState, StatusBadge } from '../components/ui'
import { Steps, STEP_LABELS } from '../components/Steps'
import { Heatmap } from '../components/Heatmap'
import { GoalCard, StreakCard, TasksCard } from '../components/SideCards'
import { LeaderboardMini } from './Community'
import { useResume } from '../lib/resume'
import { learnStatus } from '../lib/status'
import { idiomTopics, type Idiom } from '../types'
import { useI18n } from '../i18n'

/** Đề xuất: mục đến hạn ôn → đang học → chưa học (xen kẽ theo chủ đề). Không giả vờ cá nhân hóa khi chưa có lịch sử. */
function useRecommended(limit = 8): { items: { idiom: Idiom; tag: string }[]; personalized: boolean } {
  const { t: tr } = useI18n()
  const { idioms } = useIdioms()
  const ud = useUserData()
  const items: { idiom: Idiom; tag: string }[] = []
  const used = new Set<string>()
  const add = (i: Idiom | undefined, tag: string) => { if (i && !used.has(i.id) && items.length < limit) { used.add(i.id); items.push({ idiom: i, tag }) } }
  const byId = new Map(idioms.map((i) => [i.id, i]))
  ud.dueIds.slice(0, 4).forEach((id) => add(byId.get(id), tr("Cần ôn")))
  Object.values(ud.state.progress).filter((p) => learnStatus(p) === 'learning').slice(0, 2).forEach((p) => add(byId.get(p.idiomId), tr("Đang học")))
  const unlearned = idioms.filter((i) => !ud.isLearned(i.id) && !used.has(i.id))
  // Xen kẽ theo chủ đề đầu tiên để danh sách đa dạng.
  const groups = new Map<string, Idiom[]>()
  unlearned.forEach((i) => { const k = idiomTopics(i)[0] ?? ''; groups.set(k, [...(groups.get(k) ?? []), i]) })
  const lists = [...groups.values()]
  for (let r = 0; items.length < limit && lists.some((l) => l[r]); r++) lists.forEach((l) => add(l[r], tr("Chưa học")))
  const personalized = ud.dueIds.length > 0 || ud.stats.learningCount > 0
  return { items, personalized }
}

export default function Home() {
  const { t: tr, tx: trx } = useI18n()
  const { idioms, isDemo, updatedAt } = useIdioms()
  const ud = useUserData()
  const { backendConfigured, account, promptLogin } = useAuth()
  const { stats } = ud
  const resume = useResume()
  const rec = useRecommended()

  if (backendConfigured && !account) {
    return <EmptyState title={tr("Đăng nhập để xem Dashboard")} action={<button className="btn-primary" onClick={() => promptLogin()}>{tr("Đăng nhập bằng Google")}</button>}>{tr("Tiến độ, streak, nhiệm vụ và Sổ tay được lưu riêng cho tài khoản Google của bạn.")}</EmptyState>
  }
  const startTo = resume.idiom ? `/hoc/${resume.idiom.id}` : '/hoc'
  const step = resume.progress ? Math.max(0, resume.progress.stepsDone.findIndex((d) => !d)) : 0

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        {isDemo && <DemoBanner />}
        {/* Thanh thông báo chỉ hiện khi có thông tin thật. */}
        {stats.due > 0 ? (
          <Link to="/so-tay?ontap=1" className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-2 font-bold text-warn"><Bell size={20} className="shrink-0" /><span className="min-w-0 flex-1">{trx("Bạn có {0} Quán dụng ngữ đến hạn ôn tập", [stats.due])}</span><ArrowRight size={18} /></Link>
        ) : !isDemo && updatedAt ? (
          <p className="flex items-center gap-2 rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-muted"><Bell size={18} className="shrink-0" />{trx("Kho Quán dụng ngữ cập nhật ngày {0}: {1} mục", [new Date(updatedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }), idioms.length])}</p>
        ) : null}

        <section className="relative overflow-hidden rounded-xl2 border border-line bg-gradient-to-br from-brand-soft via-brand-soft to-brand/50 p-6 text-ink shadow-card sm:p-8" aria-labelledby="h-banner">
          <span aria-hidden className="han pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] font-extrabold leading-none text-brand-strong/10 sm:text-[12rem]">惯用语</span>
          <div className="relative flex max-w-xl flex-col gap-3">
            <h1 id="h-banner" className="text-3xl font-extrabold leading-tight sm:text-4xl">{tr("Học Quán dụng ngữ mỗi ngày")}</h1>
            <p className="text-xl font-bold text-brand-strong">{tr("Hiểu đúng cách dùng – Ghi nhớ lâu hơn!")}</p>
            <p className="text-muted">{tr("Khám phá Quán dụng ngữ tiếng Trung, học qua ví dụ thực tế và ôn tập theo lịch của riêng bạn.")}</p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              <Link to={startTo} className="btn-primary">{tr("Bắt đầu học ngay")}<ArrowRight size={18} /></Link>
              {stats.due > 0 && <Link to="/so-tay?ontap=1" className="btn-ghost">{trx("Ôn tập hôm nay ({0})", [stats.due])}</Link>}
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="card flex flex-col gap-3 p-4 sm:p-5" aria-labelledby="h-continue">
            <h2 id="h-continue" className="text-xl font-extrabold">{tr("Tiếp tục học")}</h2>
            {resume.idiom ? (
              <>
                <div className="min-w-0">
                  <p className="han text-4xl font-bold leading-tight [overflow-wrap:anywhere]">{resume.idiom.hanzi}</p>
                  <p className="font-semibold text-brand-strong">{resume.idiom.pinyin}</p>
                  <p className="mt-1 line-clamp-2">{resume.idiom.meaningVi}</p>
                </div>
                <Steps current={step} done={resume.progress?.stepsDone ?? [false, false, false, false]} />
                <p className="text-sm font-bold text-muted">{resume.started ? tr("Bước hiện tại: {0}", [tr(STEP_LABELS[step])]) : tr("Chưa bắt đầu bài này")}</p>
                <Link to={`/hoc/${resume.idiom.id}`} className="btn-primary mt-auto">{resume.started ? tr("Tiếp tục học") : tr("Bắt đầu học")}</Link>
              </>
            ) : resume.allDone ? (
              <><p className="text-muted">{tr("Bạn đã hoàn thành toàn bộ bài học trong kho. Hãy luyện tập để củng cố.")}</p><Link to="/luyen-tap" className="btn-primary mt-auto">{tr("Luyện tập tổng hợp")}</Link></>
            ) : <p className="text-muted">{tr("Kho Quán dụng ngữ đang trống.")}</p>}
          </section>

          <section className="card flex flex-col gap-3 p-4 sm:p-5" aria-labelledby="h-stats">
            <h2 id="h-stats" className="text-xl font-extrabold">{tr("Thống kê học tập")}</h2>
            <dl className="grid grid-cols-2 gap-2.5">
              {[[tr("Quán dụng ngữ đã học"), stats.learned, tr("đủ 4 bước")], [tr("Bài luyện tập đã hoàn thành"), stats.runs], [tr("Tổng XP tích lũy"), stats.totalPoints], [tr("Đến hạn ôn tập"), stats.due]].map(([l, v, sub]) => (
                <div key={String(l)} className="rounded-2xl bg-soft p-3"><dt className="text-xs font-bold leading-snug text-muted">{l}</dt><dd className="text-2xl font-extrabold">{v}</dd>{sub && <p className="text-[11px] font-semibold text-muted">{sub}</p>}</div>
              ))}
            </dl>
            {stats.learned === 0 && stats.runs === 0 && <p className="text-sm text-muted">{tr("Bạn chưa có hoạt động nào. Hãy bắt đầu bài học đầu tiên.")}</p>}
            <Link to="/hoc/tien-do" className="mt-auto inline-flex items-center gap-1 font-extrabold text-brand-strong">{tr("Xem thống kê chi tiết")}<ArrowRight size={18} /></Link>
          </section>
        </div>

        <section className="flex flex-col gap-3" aria-labelledby="h-rec">
          <div className="flex items-center justify-between gap-3"><h2 id="h-rec" className="text-xl font-extrabold">{tr("Quán dụng ngữ đề xuất cho bạn")}</h2><Link to="/hoc" className="shrink-0 font-extrabold text-brand-strong">{tr("Xem tất cả")}</Link></div>
          {!rec.personalized && rec.items.length > 0 && <p className="text-sm text-muted">{tr("Chưa có lịch sử học, nên đây là các mục theo chủ đề từ kho, không phải đề xuất cá nhân hóa.")}</p>}
          {rec.items.length === 0 ? <p className="text-muted">{tr("Chưa có Quán dụng ngữ để đề xuất.")}</p> : (
            <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
              {rec.items.map(({ idiom, tag }) => (
                <li key={idiom.id} className="card flex min-w-0 flex-col gap-2 overflow-hidden p-3">
                  {idiom.image && <img src={idiom.image} alt={tr("Hình minh họa {0}", [idiom.hanzi])} loading="lazy" className="h-28 w-full rounded-xl bg-white object-cover" />}
                  <div className="flex items-start justify-between gap-2"><span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-extrabold text-brand-strong">{tr(tag)}</span><AddButton idiomId={idiom.id} compact /></div>
                  <Link to={`/tu/${idiom.id}`} className="min-w-0">
                    <p className="han text-2xl font-bold leading-tight [overflow-wrap:anywhere]">{idiom.hanzi}</p>
                    <p className="truncate text-sm font-semibold text-brand-strong">{idiom.pinyin}</p>
                    <p className="line-clamp-2 text-sm leading-snug">{idiom.meaningVi}</p>
                  </Link>
                  {idiomTopics(idiom).length > 0 && <p className="truncate text-xs text-muted">{idiomTopics(idiom).slice(0, 2).map((x) => tr(x)).join(' · ')}</p>}
                  <StatusBadge idiomId={idiom.id} />
                  <Link to={tag === 'Cần ôn' ? '/so-tay?ontap=1' : `/hoc/${idiom.id}`} className="btn-soft mt-auto !min-h-[44px] !text-sm">{tag === 'Cần ôn' ? tr("Ôn tập") : tag === 'Đang học' ? tr("Học tiếp") : tr("Học")}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Heatmap />
      </div>

      <aside className="flex min-w-0 flex-col gap-4" aria-label={tr("Thông tin cá nhân")}>
        <GoalCard />
        <StreakCard />
        <TasksCard />
        <section className="card flex flex-col gap-3 p-4" aria-labelledby="h-rank">
          <div className="flex items-center justify-between gap-2"><h2 id="h-rank" className="text-lg font-extrabold">{tr("Bảng xếp hạng")}</h2><Link to="/xep-hang" className="font-extrabold text-brand-strong">{tr("Xem tất cả")}</Link></div>
          <LeaderboardMini />
        </section>
      </aside>
    </div>
  )
}
