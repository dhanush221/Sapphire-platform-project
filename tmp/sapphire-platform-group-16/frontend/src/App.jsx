import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

const Login = lazy(() => import('./features/auth/Login.jsx'))
const Register = lazy(() => import('./features/auth/Register.jsx'))
const AppLayout = lazy(() => import('./layouts/AppLayout.jsx'))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage.jsx'))
const TasksPage = lazy(() => import('./features/tasks/TasksPage.jsx'))
const DeadlinesPage = lazy(() => import('./features/deadlines/DeadlinesPage.jsx'))
const MeetingsPage = lazy(() => import('./features/meetings/MeetingsPage.jsx'))
const ResourcesPage = lazy(() => import('./features/resources/ResourcesPage.jsx'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage.jsx'))
const SettingsProfilePage = lazy(() => import('./features/settings/ProfilePage.jsx'))

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<div style={{padding:16}}>Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="deadlines" element={<DeadlinesPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/profile" element={<SettingsProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
