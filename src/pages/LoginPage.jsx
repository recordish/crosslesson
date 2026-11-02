import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../firebase/config'
import { useTitle } from '../hooks/useTitle'
import { authErrorMessage, LOCAL_USERS, loginAsLocal, loginWithGoogle } from '../services/authService'

// 다른 사이트로 튕겨 나가지 않도록 우리 사이트 안의 경로만 받습니다.
const safeNext = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/')

export default function LoginPage() {
  useTitle('로그인')
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const next = safeNext(useSearchParams()[0].get('next'))

  useEffect(() => {
    if (loading || !user) return
    navigate(profile ? next : `/profile?next=${encodeURIComponent(next)}`, { replace: true })
  }, [user, profile, loading, next, navigate])

  return (
    <section className="auth">
      <h1 className="page-title">로그인 / 회원가입</h1>
      <p className="muted">Google 계정으로 로그인해요. 처음이면 자동으로 가입돼요.</p>
      <p className="muted small">
        가입하면 <Link to="/privacy">개인정보처리방침</Link>에 동의하는 것으로 봅니다. 만 14세 미만은 가입할 수 없어요.
      </p>
      {isFirebaseConfigured ? <GoogleLogin /> : <LocalLogin />}
    </section>
  )
}

function LocalLogin() {
  return (
    <div className="auth-box">
      <p className="notice">
        로컬 모드에서는 테스트 사용자로 로그인해요. A로 레슨을 올리고 B로 신청해 보면 전체 흐름을 확인할 수 있어요.
      </p>
      {LOCAL_USERS.map((u) => (
        <button key={u.uid} type="button" onClick={() => loginAsLocal(u.uid)}>
          {u.label}로 로그인
        </button>
      ))}
    </div>
  )
}

function GoogleLogin() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function onClick() {
    setBusy(true)
    setMessage('')
    try {
      await loginWithGoogle()
    } catch (e) {
      console.error(e)
      setMessage(authErrorMessage(e) ?? '')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-box">
      <GoogleSignInButton onClick={onClick} disabled={busy} />
      {message && <p className="notice">{message}</p>}
      <p className="muted small">
        예전 크로스레슨 회원이라면 가입할 때 쓴 Gmail 주소로 로그인해 주세요.
      </p>
    </div>
  )
}
