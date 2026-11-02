import { Navigate, useLocation } from 'react-router-dom'

// 예전 PHP 주소를 새 주소로 넘깁니다. (구글 등에 색인된 링크와 외부 공유 링크용)
//   /lesson.php?no=5858 → /lesson/5858
//   /class.php?d=204    → /?teach=204   (그 과목을 가르쳐 주는 레슨 = 내가 배울 수 있는 레슨)
//   /learn.php?d=306    → /?learn=306
// Firebase Hosting 은 물음표 뒤 값(?no=)을 보고 서버에서 넘길 수 없어서 앱에서 처리합니다.
// 경로만 바뀌는 /about.php, /index.php 는 firebase.json 의 redirects(301)가 처리합니다.
export default function LegacyRedirect() {
  const { pathname, search } = useLocation()
  const params = new URLSearchParams(search)
  const num = (key) => {
    const v = Number(params.get(key))
    return Number.isInteger(v) && v > 0 ? v : null
  }

  let to = '/'
  if (pathname === '/lesson.php' && num('no')) to = `/lesson/${num('no')}`
  else if (pathname === '/class.php' && num('d')) to = `/?teach=${num('d')}`
  else if (pathname === '/learn.php' && num('d')) to = `/?learn=${num('d')}`

  return <Navigate to={to} replace />
}
