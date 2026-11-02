import { useEffect } from 'react'

const SITE = '크로스레슨'

// 화면마다 브라우저 탭 제목을 바꿉니다.
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : `${SITE}: 재능교환 · 교환과외 플랫폼`
  }, [title])
}
