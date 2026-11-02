import { useEffect, useState } from 'react'

// 일정 간격마다 현재 시각을 갱신합니다 ("3분 전" 표시를 최신으로 유지).
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
