import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import MembersPage from './pages/members/MembersPage'
import MemberDetailPage from './pages/members/MemberDetailPage'
import ClassSchedulePage from './pages/schedule/ClassSchedulePage'
import PackagesPage from './pages/packages/PackagesPage'
import PromotionsPage from './pages/promotions/PromotionsPage'
import TransactionsPage from './pages/transactions/TransactionsPage'
import ReviewsPage from './pages/reviews/ReviewsPage'
import InstructorsPage from './pages/instructors/InstructorsPage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'
import TeachingPage from './pages/teaching/TeachingPage'
import UsersPage from './pages/users/UsersPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="members/:id" element={<MemberDetailPage />} />
          <Route path="schedule" element={<ClassSchedulePage />} />
          <Route path="classes" element={<Navigate to="/schedule?tab=classes" replace />} />
          <Route path="private-sessions" element={<Navigate to="/packages" replace />} />
          <Route path="teaching" element={<TeachingPage />} />
          <Route path="packages" element={<PackagesPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="instructors" element={<InstructorsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
