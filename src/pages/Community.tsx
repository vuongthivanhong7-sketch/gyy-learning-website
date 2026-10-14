import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase, communityConfigured as backendConfigured } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'
import { useUserData } from '../store/UserData'
import { useIdioms } from '../data/IdiomsContext'
import { Page } from '../components/Layout'
import { Back, EmptyState } from '../components/ui'
import { weekStart } from '../lib/date'
import { useI18n } from '../i18n'

const BackendNeeded = ({ what }: { what: string }) => {
  const { t: tr } = useI18n()
  return (
    <EmptyState title={tr("{0} cần cơ sở dữ liệu", [what])}>
      {tr("Tính năng này dùng dữ liệu chung của mọi học viên nên cần tài khoản đăng nhập. Bản hiện tại chưa cần đăng nhập, nên phần này sẽ có ở phiên bản có tài khoản.")}
    </EmptyState>
  )
}

const fmt = (iso: string) => new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
interface Post { id: string; title: string; body: string; topic: string | null; idiom_id: string | null; idiom_hanzi: string | null; created_at: string; user_id: string; profiles: { display_name: string } | null; answers: { count: number }[] }
interface Answer { id: string; body: string; created_at: string; user_id: string; profiles: { display_name: string } | null }

export function CommunityList() {
  const { t: tr, tx: trx } = useI18n()
  const { account, promptLogin } = useAuth()
  const { idioms, topics } = useIdioms()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [err, setErr] = useState<string>()
  const [topic, setTopic] = useState('')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    let query = supabase.from('posts').select('id,title,body,topic,idiom_id,idiom_hanzi,created_at,user_id,profiles(display_name),answers(count)').order('created_at', { ascending: false }).limit(50)
    if (topic) query = query.eq('topic', topic)
    if (q.trim()) query = query.ilike('title', `%${q.trim().replace(/[%_]/g, '')}%`)
    const { data, error } = await query
    if (error) setErr(error.message); else { setErr(undefined); setPosts(data as unknown as Post[]) }
  }, [topic, q])
  useEffect(() => { void load() }, [load])

  if (!backendConfigured) return <Page title={tr("Hỏi đáp / Cộng đồng")}><BackendNeeded what={tr("Cộng đồng")} /></Page>
  return (
    <Page title={tr("Hỏi đáp / Cộng đồng")} subtitle={tr("Đặt câu hỏi và trao đổi về Quán dụng ngữ tiếng Trung.")}
      actions={<button type="button" className="btn-primary" onClick={() => (account ? setCreating((c) => !c) : promptLogin(tr("Đăng nhập để đặt câu hỏi.")))}>{creating ? tr("Đóng") : tr("Đặt câu hỏi")}</button>}>
      {creating && <PostForm idiomsList={idioms.map((i) => ({ id: i.id, hanzi: i.hanzi }))} topics={topics} onDone={() => { setCreating(false); void load() }} />}
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input !min-h-[48px] !text-base" placeholder={tr("Tìm theo tiêu đề…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={tr("Tìm câu hỏi")} />
        <select className="input !min-h-[48px] !text-base" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={tr("Lọc chủ đề")}><option value="">{tr("Mọi chủ đề")}</option>{topics.map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select>
      </div>
      {err && <p className="rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad" role="alert">{trx("Không tải được: {0}", [err])}</p>}
      {posts === null && !err ? <p className="text-muted">{tr("Đang tải…")}</p> : posts && posts.length === 0 ? (
        <EmptyState title={tr("Cộng đồng vừa mới bắt đầu")}>{tr("Chưa có câu hỏi nào. Bạn có thể là người đặt câu hỏi đầu tiên.")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">{posts?.map((p) => (
          <li key={p.id}><Link to={`/hoi-dap/${p.id}`} className="card flex flex-col gap-1 p-4">
            <span className="text-lg font-extrabold leading-snug">{p.title}</span>
            <span className="line-clamp-2 text-muted">{p.body}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{p.profiles?.display_name ?? tr("Học viên")}</span><span>{fmt(p.created_at)}</span><span>{trx("{0} trả lời", [p.answers?.[0]?.count ?? 0])}</span>
              {p.topic && <span className="chip chip-on !py-0.5">{p.topic}</span>}{p.idiom_hanzi && <span className="han chip !py-0.5">{p.idiom_hanzi}</span>}
            </span></Link></li>))}</ul>
      )}
    </Page>
  )
}

function PostForm({ idiomsList, topics, onDone }: { idiomsList: { id: string; hanzi: string }[]; topics: string[]; onDone: () => void }) {
  const { t: tr } = useI18n()
  const { account } = useAuth()
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [topic, setTopic] = useState(''); const [hanzi, setHanzi] = useState('')
  const [err, setErr] = useState<string>(); const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !account) return
    if (title.trim().length < 5) return setErr(tr("Tiêu đề cần ít nhất 5 ký tự."))
    if (body.trim().length < 5) return setErr(tr("Nội dung cần ít nhất 5 ký tự."))
    setBusy(true)
    const match = idiomsList.find((i) => i.hanzi === hanzi.trim())
    const { error } = await supabase.from('posts').insert({ user_id: account.id, title: title.trim().slice(0, 150), body: body.trim().slice(0, 4000), topic: topic || null, idiom_id: match?.id ?? null, idiom_hanzi: match?.hanzi ?? null })
    setBusy(false)
    if (error) setErr(error.message); else onDone()
  }
  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4" noValidate>
      <input className="input !text-base" placeholder={tr("Tiêu đề câu hỏi")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} aria-label={tr("Tiêu đề")} />
      <textarea className="input !min-h-[120px] !text-base" placeholder={tr("Nội dung chi tiết")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} aria-label={tr("Nội dung")} />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="input !min-h-[48px] !text-base" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={tr("Chủ đề")}><option value="">{tr("Chủ đề (không bắt buộc)")}</option>{topics.map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select>
        <input className="input han !min-h-[48px] !text-base" list="idiom-list" placeholder={tr("Gắn Quán dụng ngữ (không bắt buộc)")} value={hanzi} onChange={(e) => setHanzi(e.target.value)} aria-label={tr("Quán dụng ngữ liên quan")} />
        <datalist id="idiom-list">{idiomsList.map((i) => <option key={i.id} value={i.hanzi} />)}</datalist>
      </div>
      {err && <p className="text-sm font-bold text-bad" role="alert">{err}</p>}
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? tr("Đang đăng…") : tr("Đăng câu hỏi")}</button>
    </form>
  )
}

export function PostDetail() {
  const { t: tr, tx: trx } = useI18n()
  const { id = '' } = useParams()
  const { account, promptLogin } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [err, setErr] = useState<string>()
  const [reply, setReply] = useState('')
  const [editing, setEditing] = useState<{ kind: 'post' | 'answer'; id: string; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const [p, a] = await Promise.all([
      supabase.from('posts').select('id,title,body,topic,idiom_id,idiom_hanzi,created_at,user_id,profiles(display_name),answers(count)').eq('id', id).maybeSingle(),
      supabase.from('answers').select('id,body,created_at,user_id,profiles(display_name)').eq('post_id', id).order('created_at', { ascending: true }),
    ])
    if (p.error || a.error) setErr((p.error ?? a.error)!.message)
    setPost(p.data as unknown as Post | null); setAnswers((a.data ?? []) as unknown as Answer[])
  }, [id])
  useEffect(() => { void load() }, [load])

  if (!backendConfigured) return <Page title={tr("Hỏi đáp")}><BackendNeeded what={tr("Cộng đồng")} /></Page>
  if (err) return <p className="rounded-xl bg-bad-soft p-3 font-semibold text-bad" role="alert">{err}</p>
  if (!post) return <p className="text-muted">{tr("Đang tải…")}</p>

  const sendReply = async () => {
    if (!supabase) return
    if (!account) return promptLogin(tr("Đăng nhập để trả lời."))
    if (reply.trim().length < 2) return
    const { error } = await supabase.from('answers').insert({ post_id: id, user_id: account.id, body: reply.trim().slice(0, 4000) })
    if (error) setErr(error.message); else { setReply(''); void load() }
  }
  const saveEdit = async () => {
    if (!supabase || !editing) return
    const text = editing.text.trim()
    if (text.length < 2) return
    const { error } = editing.kind === 'post' ? await supabase.from('posts').update({ body: text }).eq('id', editing.id) : await supabase.from('answers').update({ body: text }).eq('id', editing.id)
    if (error) setErr(error.message); else { setEditing(null); void load() }
  }
  const del = async (kind: 'post' | 'answer', rid: string) => {
    if (!supabase || !confirm(tr("Xóa nội dung này? Không thể khôi phục."))) return
    const { error } = await supabase.from(kind === 'post' ? 'posts' : 'answers').delete().eq('id', rid)
    if (error) setErr(error.message); else if (kind === 'post') window.location.assign(import.meta.env.BASE_URL + 'hoi-dap'); else void load()
  }
  const Body = ({ kind, rid, owner, text }: { kind: 'post' | 'answer'; rid: string; owner: boolean; text: string }) => editing?.id === rid ? (
    <div className="flex flex-col gap-2"><textarea className="input !min-h-[100px] !text-base" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} maxLength={4000} />
      <div className="flex gap-2"><button className="btn-primary !min-h-[44px]" onClick={saveEdit}>{tr("Lưu")}</button><button className="btn-ghost !min-h-[44px]" onClick={() => setEditing(null)}>{tr("Hủy")}</button></div></div>
  ) : (
    <>
      <p className="whitespace-pre-wrap">{text}</p>
      {owner && <div className="mt-2 flex gap-2"><button className="btn-ghost !min-h-[40px] !px-3 !text-sm" onClick={() => setEditing({ kind, id: rid, text })}><Pencil size={16} />{tr("Sửa")}</button><button className="btn-ghost !min-h-[40px] !px-3 !text-sm !text-bad" onClick={() => del(kind, rid)}><Trash2 size={16} />{tr("Xóa")}</button></div>}
    </>
  )
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Back to="/hoi-dap">{tr("Cộng đồng")}</Back>
      <article className="card flex flex-col gap-2 p-4 sm:p-5">
        <h1 className="text-2xl font-extrabold">{post.title}</h1>
        <p className="text-sm text-muted">{post.profiles?.display_name ?? tr("Học viên")} · {fmt(post.created_at)}</p>
        {post.idiom_id && <Link to={`/tu/${post.idiom_id}`} className="han chip chip-on self-start">{post.idiom_hanzi}</Link>}
        {Body({ kind: 'post', rid: post.id, owner: account?.id === post.user_id, text: post.body })}
      </article>
      <h2 className="text-lg font-extrabold">{trx("{0} câu trả lời", [answers.length])}</h2>
      {answers.map((a) => <div key={a.id} className="card p-4"><p className="mb-1 text-sm text-muted">{a.profiles?.display_name ?? tr("Học viên")} · {fmt(a.created_at)}</p>{Body({ kind: 'answer', rid: a.id, owner: account?.id === a.user_id, text: a.body })}</div>)}
      <div className="card flex flex-col gap-2 p-4">
        <textarea className="input !min-h-[100px] !text-base" placeholder={account ? tr("Viết câu trả lời…") : tr("Đăng nhập để trả lời")} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} aria-label={tr("Câu trả lời")} />
        <button className="btn-primary" onClick={sendReply} disabled={!!account && reply.trim().length < 2}>{account ? tr("Gửi trả lời") : tr("Đăng nhập để trả lời")}</button>
      </div>
    </div>
  )
}

/* ───────── Bảng xếp hạng (tính từ database) ───────── */
interface Row { rank: number; display_name: string; points: number; is_me: boolean }
function useLeaderboard(limit: number) {
  const { account } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string>()
  useEffect(() => {
    if (!supabase) return
    supabase.rpc('weekly_leaderboard', { week_start: `${weekStart()}T00:00:00+07:00`, max_rows: limit }).then(({ data, error }) => {
      if (error) setErr(error.message); else setRows((data ?? []) as Row[])
    })
  }, [limit, account?.id])
  return { rows, err }
}

function Table({ rows }: { rows: Row[] }) {
  const { t: tr, tx: trx } = useI18n()
  return (
    <ol className="flex flex-col gap-2">{rows.map((r) => (
      <li key={r.rank} className={`card flex items-center gap-3 px-4 py-3 ${r.is_me ? '!border-brand bg-brand-soft' : ''}`}>
        <span className="w-7 text-center text-lg font-extrabold text-brand-strong">{r.rank}</span>
        <span className="min-w-0 flex-1 truncate font-bold">{r.display_name}{r.is_me && tr(" (bạn)")}</span>
        <span className="font-extrabold">{trx("{0} điểm", [r.points])}</span></li>))}</ol>
  )
}

export function LeaderboardMini() {
  const { t: tr, tx: trx } = useI18n()
  const { stats } = useUserData()
  const { rows, err } = useLeaderboard(5)
  if (!backendConfigured) return <div className="rounded-2xl bg-soft p-3 text-sm text-muted">{tr("Bảng xếp hạng cần tài khoản đăng nhập nên chưa có ở bản này. Điểm tuần này của bạn trên máy này:")}{' '}<b>{stats.weekPoints}</b>.</div>
  if (err) return <div className="rounded-2xl bg-bad-soft p-3 text-sm text-bad">{trx("Không tải được bảng xếp hạng: {0}", [err])}</div>
  if (rows === null) return <div className="p-2 text-muted">{tr("Đang tải…")}</div>
  if (rows.length === 0) return <div className="rounded-2xl bg-soft p-3 text-sm text-muted">{tr("Bảng xếp hạng sẽ xuất hiện khi có hoạt động học tập.")}</div>
  return <Table rows={rows} />
}

export function Leaderboard() {
  const { t: tr } = useI18n()
  const { rows, err } = useLeaderboard(20)
  const { stats } = useUserData()
  return (
    <Page title={tr("Bảng xếp hạng tuần")} subtitle={tr("Điểm: hoàn thành một bài học +10, mỗi lần ôn nhớ được +3, mỗi câu luyện tập đúng +2. Tuần tính từ thứ Hai theo giờ Việt Nam.")}>
      {!backendConfigured ? <><BackendNeeded what={tr("Bảng xếp hạng")} /><p className="text-muted">{tr("Điểm tuần này của bạn trên thiết bị này:")}{' '}<b>{stats.weekPoints}</b></p></> :
        err ? <p className="rounded-xl bg-bad-soft p-3 font-semibold text-bad" role="alert">{err}</p> :
        rows === null ? <p className="text-muted">{tr("Đang tải…")}</p> :
        rows.length === 0 ? <EmptyState title={tr("Chưa có ai trên bảng xếp hạng tuần này")} action={<Link to="/hoc" className="btn-primary">{tr("Bắt đầu học")}</Link>}>{tr("Hoàn thành một bài học hoặc bài luyện tập để ghi điểm.")}</EmptyState> :
        <div className="mx-auto w-full max-w-xl"><Table rows={rows} /></div>}
    </Page>
  )
}
