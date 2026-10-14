import { Link, useParams } from 'react-router-dom'
import { useIdioms } from '../data/IdiomsContext'
import { resolveIdiom, useUserData } from '../store/UserData'
import { useState } from 'react'
import { RelatedByTopic } from '../components/IdiomList'
import { ImageEditor } from '../components/ImageEditor'
import { useOverrides } from '../store/OverridesContext'
import { useVerify } from '../store/VerifyContext'
import { ReferenceSources } from '../components/ReferenceSources'
import { IdiomDetail } from '../components/Flashcard'
import { Back, EmptyState } from '../components/ui'
import { useI18n } from '../i18n'

export function IdiomPage() {
  const { t: tr, tx: trx } = useI18n()
  const { id = '' } = useParams()
  const { idioms, status } = useIdioms()
  const ud = useUserData()
  const idiom = resolveIdiom(idioms, ud.state.custom, id)
  const { isAdmin } = useOverrides()
  const ver = useVerify()
  const [editImg, setEditImg] = useState(false)
  if (status === 'loading') return <p className="text-muted">{tr("Đang tải…")}</p>
  if (!idiom) return <EmptyState title={tr("Không tìm thấy Quán dụng ngữ")} action={<Link to="/tra-cuu" className="btn-primary">{tr("Về trang tra cứu")}</Link>} />
  const p = ud.progressOf(id)
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Back to="/tra-cuu">{tr("Tra cứu Quán dụng ngữ")}</Back>
      <h1 className="text-xl font-extrabold">{tr("Chi tiết Quán dụng ngữ")}</h1>
      <div className="card p-4 sm:p-6"><IdiomDetail idiom={idiom} /></div>
      {isAdmin && !idiom.custom && (editImg ? <ImageEditor idiom={idiom} onClose={() => setEditImg(false)} /> : <button type="button" className="btn-ghost self-start" onClick={() => setEditImg(true)}>{tr("Quản trị: thay hình minh họa")}</button>)}
      {p?.srs && p.saved && <p className="text-sm text-muted">{trx("Lịch ôn: {0}", [new Date(p.srs.dueAt) <= new Date() ? tr("đến hạn ôn") : tr("lần tới {0}", [new Date(p.srs.dueAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })])])}</p>}
      {!idiom.custom && <Link to={`/hoc/${idiom.id}`} className="btn-primary">{tr("Học bài này (4 bước)")}</Link>}
      {!idiom.custom && <ReferenceSources sources={ver.sources} entry={ver.lookup(idiom.hanzi)} />}
      <RelatedByTopic idiom={idiom} all={idioms} />
    </div>
  )
}
