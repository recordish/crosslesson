import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { trackPageView } from '../services/analytics'

// 화면(주소)이 바뀔 때마다 접속 기록을 한 건 남깁니다.
export default function PageTracker() {
  const { pathname } = useLocation()
  const { user, loading } = useAuth()
  const last = useRef('')

  useEffect(() => {
    if (loading || last.current === pathname) return
    last.current = pathname
    trackPageView(pathname, { uid: user?.uid ?? '' })
  }, [pathname, loading, user])

  return null
}
