import { Link } from 'react-router-dom'
import { useTitle } from '../hooks/useTitle'

export default function NotFoundPage() {
  useTitle('페이지를 찾을 수 없어요')
  return (
    <p className="empty">
      페이지를 찾을 수 없어요.
      <br />
      <Link to="/">레슨 목록으로</Link>
    </p>
  )
}
