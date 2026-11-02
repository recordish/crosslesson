import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// 다른 화면으로 넘어가면 맨 위부터 보여줍니다 (필터만 바뀔 때는 그대로).
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
