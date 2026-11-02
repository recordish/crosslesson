import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// 로그인이 필요한 화면. 로그인하지 않았으면 로그인 화면으로,
// 닉네임(프로필)을 아직 정하지 않았으면 프로필 화면으로 보냅니다.
export default function ProtectedRoute({ children, requireProfile = true }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)

  if (loading) return <p className="empty">불러오는 중…</p>
  if (!user) return <Navigate to={`/login?next=${next}`} replace />
  if (requireProfile && !profile) return <Navigate to={`/profile?next=${next}`} replace />
  return children
}
