import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CreateDiary } from '../pages/CreateDiary'
import { Dashboard } from '../pages/Dashboard'
import { DiaryEntryPage } from '../pages/DiaryEntryPage'
import { EditDiary } from '../pages/EditDiary'
import { Login } from '../pages/Login'
import { NotFound } from '../pages/NotFound'
import { Register } from '../pages/Register'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/diary/new" element={<CreateDiary />} />
          <Route path="/diary/:id" element={<DiaryEntryPage />} />
          <Route path="/diary/:id/edit" element={<EditDiary />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
