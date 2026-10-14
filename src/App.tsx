import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout, LoginDialog } from './components/Layout'
import { GoalDialog } from './components/GoalDialog'
import { PrefsSync } from './components/Sync'
import Home from './pages/Home'
import { IdiomPage } from './pages/Learn'
import LearnModule from './pages/LearnModule'
import Lesson from './pages/Lesson'
import Practice from './pages/Practice'
import HskExam from './pages/HskExam'
import Lookup from './pages/Lookup'
import { CommunityList, Leaderboard, PostDetail } from './pages/Community'
import Me from './pages/Me'
import Admin from './pages/Admin'

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="hoc" element={<LearnModule tab="hoc" />} />
          <Route path="hoc/tien-do" element={<LearnModule tab="tien-do" />} />
          <Route path="hoc/cua-toi" element={<Navigate to="/so-tay" replace />} />
          <Route path="hoc/:id" element={<Lesson />} />
          <Route path="luyen-tap" element={<Practice />} />
          <Route path="luyen-thi" element={<HskExam />} />
          <Route path="tra-cuu" element={<Lookup />} />
          <Route path="tu/:id" element={<IdiomPage />} />
          <Route path="so-tay" element={<LearnModule tab="cua-toi" />} />
          <Route path="hoi-dap" element={<CommunityList />} />
          <Route path="hoi-dap/:id" element={<PostDetail />} />
          <Route path="xep-hang" element={<Leaderboard />} />
          <Route path="toi" element={<Me />} />
          <Route path="quan-tri" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <LoginDialog />
      <GoalDialog />
      <PrefsSync />
    </>
  )
}
