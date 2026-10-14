import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, BookOpen, Bell, CalendarClock, ChevronDown, ChevronsLeft, ChevronsRight, Dumbbell, Flame, GraduationCap, Globe2, History, Home, LayoutGrid, ListTree,
  LogOut, Menu, MessageCircleQuestion, Moon, NotebookPen, RefreshCw, Search, Settings, Star, Sun, Target, Trophy, User, X, type LucideIcon,
} from 'lucide-react'
import { Logo, TtsNotice } from './ui'
import { useAuth } from '../store/AuthContext'
import { useUserData } from '../store/UserData'
import { useUi } from '../store/UiContext'
import { computeTasks } from '../lib/tasks'
import { useI18n } from '../i18n'

interface Item { key: string; to: string; label: string; icon: LucideIcon; sub?: boolean; /** khớp theo đường dẫn */ path: string; prefix?: boolean; exclude?: string[]; params?: Record<string, string>; notParams?: string[] }
interface Group { title: string; items: Item[] }

/** Các mục của sidebar. Mục "Tra cứu chung/nguồn sách/chủ đề" là chế độ con của cùng một trang, không phải trang trùng lặp. */
function useNavGroups(): Group[] {
  const { t: tr } = useI18n()
  return [
    { title: tr("Học"), items: [
      { key: 'dash', to: '/', path: '/', label: 'Dashboard', icon: LayoutGrid },
      // Một mục duy nhất cho danh sách và các bài học (đang ở bài học vẫn sáng mục này).
      { key: 'learn', to: '/hoc', path: '/hoc', prefix: true, exclude: ['/hoc/tien-do', '/hoc/cua-toi'], notParams: ['xem'], label: tr("Học Quán dụng ngữ"), icon: BookOpen },
      { key: 'practice', to: '/luyen-tap', path: '/luyen-tap', label: tr("Luyện tập tổng hợp"), icon: Dumbbell },
      { key: 'exam', to: '/luyen-thi', path: '/luyen-thi', label: tr("Luyện thi HSK 5"), icon: GraduationCap },
      { key: 'srs', to: '/so-tay?ontap=1', path: '/so-tay', params: { ontap: '1' }, label: tr("Ôn tập SRS"), icon: RefreshCw },
    ] },
    { title: tr("Theo dõi học tập"), items: [
      { key: 'progress', to: '/hoc/tien-do', path: '/hoc/tien-do', notParams: ['muc'], label: tr("Tiến độ học tập"), icon: BarChart3 },
      { key: 'history', to: '/hoc/tien-do?muc=lich-su', path: '/hoc/tien-do', params: { muc: 'lich-su' }, label: tr("Lịch sử học"), icon: History },
      { key: 'stats', to: '/hoc/tien-do?muc=thong-ke', path: '/hoc/tien-do', params: { muc: 'thong-ke' }, label: tr("Thống kê và phân tích"), icon: CalendarClock },
    ] },
    { title: tr("Tra cứu"), items: [
      { key: 'dict', to: '/tra-cuu', path: '/tra-cuu', notParams: ['che-do'], label: tr("Tra từ điển"), icon: Search },
      { key: 'general', to: '/tra-cuu?che-do=chung', path: '/tra-cuu', params: { 'che-do': 'chung' }, sub: true, label: tr("Tra cứu chung"), icon: Globe2 },
      { key: 'source', to: '/tra-cuu?che-do=tai-lieu', path: '/tra-cuu', params: { 'che-do': 'tai-lieu' }, sub: true, label: tr("Tra cứu theo nguồn sách"), icon: BookOpen },
      { key: 'topic', to: '/hoc?xem=chude', path: '/hoc', params: { xem: 'chude' }, sub: true, label: tr("Tra cứu theo chủ đề"), icon: ListTree },
    ] },
    { title: tr("Cộng đồng"), items: [
      { key: 'qa', to: '/hoi-dap', path: '/hoi-dap', prefix: true, label: tr("Hỏi - Đáp"), icon: MessageCircleQuestion },
      { key: 'rank', to: '/xep-hang', path: '/xep-hang', label: tr("Bảng xếp hạng"), icon: Trophy },
    ] },
    { title: tr("Cá nhân"), items: [
      { key: 'notebook', to: '/so-tay', path: '/so-tay', notParams: ['ontap'], label: tr("Sổ tay của tôi"), icon: NotebookPen },
      { key: 'account', to: '/toi', path: '/toi', label: tr("Cài đặt tài khoản"), icon: User },
    ] },
  ]
}

/** Chọn đúng một mục đang hoạt động: mục khớp cụ thể nhất. */
function activeKey(groups: Group[], pathname: string, search: URLSearchParams): string | null {
  let best: { key: string; score: number } | null = null
  for (const it of groups.flatMap((g) => g.items)) {
    const pathOk = it.prefix ? pathname.startsWith(it.path) && !(it.exclude ?? []).some((e) => pathname.startsWith(e)) : pathname === it.path
    if (!pathOk) continue
    if (it.params && !Object.entries(it.params).every(([k, v]) => search.get(k) === v)) continue
    if (it.notParams && it.notParams.some((k) => search.has(k))) continue
    const score = Object.keys(it.params ?? {}).length * 10 + (it.prefix ? 0 : 1)
    if (!best || score > best.score) best = { key: it.key, score }
  }
  return best?.key ?? null
}

const store = { get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* bỏ qua */ } } }

function NavList({ groups, active, collapsed = false, onNavigate }: { groups: Group[]; active: string | null; collapsed?: boolean; onNavigate?: () => void }) {
  const { t: tr } = useI18n()
  const { stats } = useUserData()
  const [closed, setClosed] = useState<Set<string>>(() => new Set(JSON.parse(store.get('gyy:nav-closed') ?? '[]') as string[]))
  const toggle = (t: string) => setClosed((c) => { const n = new Set(c); n.has(t) ? n.delete(t) : n.add(t); store.set('gyy:nav-closed', JSON.stringify([...n])); return n })
  return (
    <nav aria-label="Menu chính" className="flex flex-col gap-3">
      {groups.map((g) => {
        const hasActive = g.items.some((i) => i.key === active)
        const open = collapsed || hasActive || !closed.has(g.title)
        return (
          <div key={g.title}>
            {!collapsed && (
              <button type="button" onClick={() => toggle(g.title)} aria-expanded={open} className={`mb-1 flex min-h-[36px] w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-extrabold uppercase tracking-wide ${hasActive ? 'text-brand-strong' : 'text-muted'}`}>
                <span aria-hidden className={`h-4 w-1 rounded-full ${hasActive ? 'bg-brand' : 'bg-warn'}`} />
                <span className="flex-1">{g.title}</span>
                <ChevronDown size={16} className={`transition ${open ? '' : '-rotate-90'}`} />
              </button>
            )}
            {open && (
              <ul className="flex flex-col gap-0.5">
                {g.items.map((it) => (
                  <li key={it.key}>
                    <Link to={it.to} onClick={onNavigate} title={collapsed ? it.label : undefined} aria-label={collapsed ? it.label : undefined} aria-current={active === it.key ? 'page' : undefined}
                      className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-3 py-2 font-bold transition ${collapsed ? 'justify-center' : ''} ${it.sub && !collapsed ? 'ml-4 !min-h-[40px] text-[15px]' : 'text-base'} ${active === it.key ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-soft'}`}>
                      <it.icon size={it.sub ? 18 : 21} className="shrink-0" />
                      {!collapsed && <span className="min-w-0 flex-1">{it.label}</span>}
                      {!collapsed && it.key === 'srs' && stats.due > 0 && <span className="rounded-full bg-warn px-2 py-0.5 text-xs font-extrabold text-white">{stats.due}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('touchstart', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return { open, setOpen, ref }
}

function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => mo.disconnect()
}
/** Chế độ sáng/tối dùng chung cho mọi nút; lưu lựa chọn để giữ sau khi tải lại trang. */
function useTheme() {
  const dark = useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains('dark'), () => false)
  const toggle = useCallback(() => {
    const n = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', n)
    store.set('gyy:theme', n ? 'dark' : 'light')
  }, [])
  return { dark, toggle }
}

function ThemeButton({ className = '' }: { className?: string }) {
  const { t: tr } = useI18n()
  const { dark, toggle } = useTheme()
  return (
    <button type="button" onClick={toggle} aria-label={dark ? tr("Chuyển sang giao diện sáng") : tr("Chuyển sang giao diện tối")} className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-soft ${className}`}>
      {dark ? <Sun size={22} /> : <Moon size={22} />}
    </button>
  )
}

function StatChips() {
  const { t: tr } = useI18n()
  const { stats } = useUserData()
  return (
    <div className="flex items-center gap-1">
      <Link to="/hoc/tien-do?muc=lich-su" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 font-extrabold hover:bg-soft" title={tr("Streak hiện tại")} aria-label={tr("Streak {0} ngày. Xem lịch sử học", [stats.streak.current])}>
        <Flame size={20} className={stats.streak.current > 0 ? 'text-[#ea580c]' : 'text-muted'} /><span>{stats.streak.current}<span className="hidden xl:inline"> {' '}{tr("ngày")}</span></span>
      </Link>
      <Link to="/hoc/tien-do?muc=thong-ke" className="hidden min-h-[40px] items-center gap-1.5 rounded-full px-2.5 font-extrabold hover:bg-soft min-[350px]:inline-flex" title={tr("Tổng điểm XP")} aria-label={tr("{0} XP. Xem thống kê", [stats.totalPoints])}>
        <Star size={20} className="text-[#d97706]" fill="currentColor" /><span>{stats.totalPoints}<span className="hidden xl:inline"> {' '}{tr("XP")}</span></span>
      </Link>
    </div>
  )
}

function NotificationBell() {
  const { t: tr } = useI18n()
  const { open, setOpen, ref } = usePopover()
  const ud = useUserData()
  const items = useMemo(() => {
    const out: { id: string; text: string; to: string }[] = []
    const { prefs } = ud.state
    if (prefs.notifyDue && ud.stats.due > 0) out.push({ id: 'due', text: tr("{0} Quán dụng ngữ đến hạn ôn tập", [ud.stats.due]), to: '/so-tay?ontap=1' })
    const tasks = computeTasks(ud.state, ud.stats.due)
    tasks.filter((t) => t.done && !t.claimed).forEach((t) => out.push({ id: `task-${t.id}`, text: tr("Nhiệm vụ “{0}” đã hoàn thành. Nhận +{1} XP", [tr(t.title), t.xp]), to: '/' }))
    if (prefs.notifyDaily && !ud.stats.studiedToday) out.push({ id: 'daily', text: tr("Hôm nay bạn chưa học. Mục tiêu: {0} Quán dụng ngữ mới", [prefs.dailyNew]), to: '/hoc' })
    return out
  }, [ud])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={items.length ? tr("Thông báo, {0} mục mới", [items.length]) : tr("Thông báo, chưa có mục mới")} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-soft">
        <Bell size={22} />
        {items.length > 0 && <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad px-1 text-[11px] font-extrabold text-white">{items.length}</span>}
      </button>
      {open && (
        <div className="card absolute right-0 top-full z-50 mt-2 w-[min(90vw,340px)] p-2" role="menu">
          <p className="px-3 py-2 text-sm font-extrabold text-muted">{tr("Thông báo")}</p>
          {items.length === 0 ? <p className="px-3 py-4 text-muted">{tr("Chưa có thông báo mới.")}</p> : items.map((n) => (
            <Link key={n.id} to={n.to} onClick={() => setOpen(false)} role="menuitem" className="block rounded-xl px-3 py-2.5 font-semibold hover:bg-soft">{n.text}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const { t: tr } = useI18n()
  const { open, setOpen, ref } = usePopover()
  const { account, backendConfigured, promptLogin, signOut } = useAuth()
  const { openGoals } = useUi()
  const { dark, toggle } = useTheme()
  const name = account?.displayName ?? tr("Học viên")
  const itemCls = 'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left font-semibold hover:bg-soft'
  if (backendConfigured && !account) return <button type="button" onClick={() => promptLogin()} className="btn-primary !min-h-[44px] !px-4 !text-sm">{tr("Đăng nhập")}</button>
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={tr("Tài khoản: {0}", [name])} className="flex min-h-[44px] items-center gap-2 rounded-full pl-1 pr-1 hover:bg-soft md:pr-3">
        {account?.avatarUrl ? <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-base font-extrabold text-on-brand" aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>}
        <span className="hidden max-w-[9rem] truncate text-sm font-extrabold md:block">{name}</span>
        <ChevronDown size={16} className="hidden md:block" />
      </button>
      {open && (
        <div className="card absolute right-0 top-full z-50 mt-2 w-[min(92vw,300px)] p-2" role="menu">
          <div className="px-3 py-2"><p className="truncate font-extrabold">{name}</p><p className="text-sm text-muted">{account ? tr("Đã đăng nhập") : tr("Dữ liệu học lưu trên máy này")}</p></div>
          <Link to="/toi" role="menuitem" className={itemCls} onClick={() => setOpen(false)}><User size={20} />{tr("Hồ sơ cá nhân")}</Link>
          <Link to="/toi" role="menuitem" className={itemCls} onClick={() => setOpen(false)}><Settings size={20} />{tr("Cài đặt tài khoản")}</Link>
          <button type="button" role="menuitem" className={itemCls} onClick={() => { setOpen(false); openGoals() }}><Target size={20} />{tr("Cài đặt mục tiêu học")}</button>
          <button type="button" role="menuitem" className={itemCls} onClick={() => { setOpen(false); openGoals() }}><Bell size={20} />{tr("Cài đặt thông báo")}</button>
          <button type="button" role="menuitem" className={itemCls} onClick={toggle}>{dark ? <Sun size={20} /> : <Moon size={20} />}{dark ? tr("Giao diện sáng") : tr("Giao diện tối")}</button>
          {account && <button type="button" role="menuitem" className={`${itemCls} text-bad`} onClick={() => { setOpen(false); void signOut() }}><LogOut size={20} />{tr("Đăng xuất")}</button>}
        </div>
      )}
    </div>
  )
}

const TOP_LINKS: { to: string; label: string; icon: LucideIcon; match: string }[] = [
  { to: '/tra-cuu', label: 'Tra từ điển', icon: Search, match: '/tra-cuu' },
  { to: '/so-tay', label: 'Sổ tay của tôi', icon: NotebookPen, match: '/so-tay' },
  { to: '/hoi-dap', label: 'Hỏi - Đáp', icon: MessageCircleQuestion, match: '/hoi-dap' },
]

export function Layout() {
  const { t: tr } = useI18n()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => store.get('gyy:sidebar') === 'collapsed')
  const loc = useLocation()
  const groups = useNavGroups()
  const active = activeKey(groups, loc.pathname, new URLSearchParams(loc.search))
  const drawerRef = useRef<HTMLDivElement>(null)
  const wide = loc.pathname === '/'

  useEffect(() => { setOpen(false); if (!loc.hash) window.scrollTo(0, 0) }, [loc.pathname, loc.search, loc.hash])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])
  const toggleCollapsed = () => setCollapsed((c) => { store.set('gyy:sidebar', c ? 'open' : 'collapsed'); return !c })

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-[64px] max-w-[1600px] items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
          <button type="button" onClick={() => setOpen(true)} aria-label={tr("Mở menu")} aria-expanded={open} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-soft lg:hidden"><Menu size={26} /></button>
          <Link to="/" className="flex shrink-0 items-center gap-2.5 lg:w-[230px]" aria-label={tr("GYY, về Dashboard")}>
            <Logo />
            <span className="hidden leading-tight min-[480px]:block"><span className="block text-lg font-extrabold">{tr("GYY")}</span><span className="block text-xs text-muted">{tr("Học Quán dụng ngữ tiếng Trung")}</span></span>
          </Link>
          <nav aria-label={tr("Điều hướng nhanh")} className="ml-2 hidden items-center gap-1 lg:flex">
            {TOP_LINKS.map((t) => (
              <Link key={t.to} to={t.to} aria-current={loc.pathname.startsWith(t.match) ? 'page' : undefined} className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 font-bold transition ${loc.pathname.startsWith(t.match) ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-soft'}`}><t.icon size={20} />{tr(t.label)}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
            <StatChips />
            <ThemeButton className="hidden md:inline-flex" />
            <NotificationBell />
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`sticky top-[64px] hidden h-[calc(100dvh-64px)] shrink-0 overflow-y-auto border-r border-line py-4 transition-[width] lg:block ${collapsed ? 'w-[76px] px-2' : 'w-[272px] px-3'}`} aria-label={tr("Thanh bên")}>
          <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? tr("Mở rộng thanh bên") : tr("Thu gọn thanh bên")} className={`mb-3 flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted hover:bg-soft ${collapsed ? 'w-full justify-center' : ''}`}>
            {collapsed ? <ChevronsRight size={20} /> : <><ChevronsLeft size={20} />{tr("Thu gọn")}</>}
          </button>
          <NavList groups={groups} active={active} collapsed={collapsed} />
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-[calc(var(--bottom-h)+24px+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:pb-10 lg:pt-7">
          <div className={`mx-auto w-full ${wide ? 'max-w-[1240px]' : 'max-w-[1040px]'}`}><Outlet /></div>
        </main>
      </div>

      <TtsNotice />
      <BottomNav onMore={() => setOpen(true)} />

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label={tr("Đóng menu")} className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div ref={drawerRef} className="absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col bg-card shadow-2xl" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-line px-4">
              <span className="flex items-center gap-2.5"><Logo /><b className="text-lg">{tr("GYY")}</b></span>
              <button type="button" onClick={() => setOpen(false)} aria-label={tr("Đóng menu")} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-soft"><X size={24} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"><NavList groups={groups} active={active} onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}
    </div>
  )
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const { t: tr } = useI18n()
  const { stats } = useUserData()
  const items = [
    { to: '/', label: tr("Trang chủ"), icon: Home, end: true },
    { to: '/hoc', label: tr("Học"), icon: BookOpen, end: false },
    { to: '/luyen-tap', label: tr("Luyện tập"), icon: Dumbbell, end: false },
    { to: '/so-tay', label: tr("Sổ tay"), icon: NotebookPen, end: false },
  ]
  const loc = useLocation()
  const on = (it: (typeof items)[number]) => (it.end ? loc.pathname === it.to : loc.pathname.startsWith(it.to))
  return (
    <nav aria-label={tr("Điều hướng nhanh trên điện thoại")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex h-[var(--bottom-h)] max-w-xl">
        {items.map((it) => (
          <Link key={it.to} to={it.to} aria-current={on(it) ? 'page' : undefined} className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[11px] font-bold min-[360px]:text-[12px] ${on(it) ? 'text-brand-strong' : 'text-muted'}`}>
            <it.icon size={24} />{it.label}
            {it.to === '/so-tay' && stats.due > 0 && <span className="absolute right-[22%] top-1.5 h-2.5 w-2.5 rounded-full bg-warn" aria-label={tr("{0} mục cần ôn", [stats.due])} />}
          </Link>
        ))}
        <Link to="/toi" aria-current={loc.pathname.startsWith('/toi') ? 'page' : undefined} className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[11px] font-bold min-[360px]:text-[12px] ${loc.pathname.startsWith('/toi') ? 'text-brand-strong' : 'text-muted'}`}><User size={24} />{tr('Tôi')}</Link>
      </div>
    </nav>
  )
}

export function LoginDialog() {
  const { t: tr } = useI18n()
  const { loginPrompt, closeLoginPrompt, signInWithGoogle, backendConfigured } = useAuth()
  const [err, setErr] = useState<string | null>(null)
  if (!loginPrompt.open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={tr("Yêu cầu đăng nhập")}>
      <button type="button" aria-label={tr("Đóng")} className="absolute inset-0 bg-black/50" onClick={closeLoginPrompt} />
      <div className="card relative w-full max-w-md rounded-b-none p-6 sm:rounded-b-xl2" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <h2 className="text-xl font-extrabold">{tr("Đăng nhập để tiếp tục")}</h2>
        <p className="mt-2 text-muted">{loginPrompt.reason ?? tr("Đăng nhập bằng tài khoản Google của bạn để lưu tiến độ và Sổ tay.")}</p>
        {err && <p className="mt-3 rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad">{err}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {backendConfigured ? (
            <button type="button" className="btn-primary" onClick={async () => setErr(await signInWithGoogle())}>{tr("Đăng nhập bằng Google")}</button>
          ) : (
            <p className="text-sm text-muted">{tr("Đăng nhập chưa được cấu hình trên bản triển khai này.")}</p>
          )}
          <button type="button" className="btn-ghost" onClick={closeLoginPrompt}>{tr("Để sau")}</button>
        </div>
      </div>
    </div>
  )
}

export const Page = ({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) => (
  <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="page-title">{title}</h1>{subtitle && <p className="mt-1 max-w-prose text-muted">{subtitle}</p>}</div>
      {actions}
    </div>
    {children}
  </div>
)
