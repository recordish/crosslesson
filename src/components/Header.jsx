import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../firebase/config'

export default function Header() {
  const { user } = useAuth()
  const tab = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" aria-label="Crosslesson 홈">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>Crosslesson</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={tab}>레슨 찾기</NavLink>
          <NavLink to="/new" className={tab}>레슨 등록</NavLink>
          {user ? (
            <NavLink to="/me" className={tab}>내 활동</NavLink>
          ) : (
            <NavLink to="/login" className={tab}>로그인</NavLink>
          )}
        </nav>
      </div>
      {!isFirebaseConfigured && (
        <p className="dev-banner">로컬 모드: 데이터는 이 브라우저에만 저장됩니다 (Firebase 설정 전)</p>
      )}
    </header>
  )
}
