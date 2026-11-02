import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../firebase/config'
import { useTitle } from '../hooks/useTitle'
import {
  authErrorMessage,
  LOCAL_USERS,
  loginAsLocal,
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
  signupWithEmail,
} from '../services/authService'

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
      <p className="muted">처음이면 자동으로 가입돼요.</p>
      {isFirebaseConfigured ? <FirebaseLogin /> : <LocalLogin />}
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

function FirebaseLogin() {
  const [mode, setMode] = useState('login') // login | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function run(fn) {
    setBusy(true)
    setMessage('')
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setMessage(authErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    if (mode === 'reset') {
      run(async () => {
        await resetPassword(email)
        setMessage('비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요.')
      })
    } else {
      run(() => (mode === 'login' ? loginWithEmail(email, password) : signupWithEmail(email, password)))
    }
  }

  return (
    <div className="auth-box">
      <GoogleSignInButton onClick={() => run(loginWithGoogle)} disabled={busy} />
      <div className="divider"><span>또는 이메일로</span></div>
      <form onSubmit={onSubmit} className="auth-form">
        <input type="email" autoComplete="email" placeholder="이메일" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'reset' && (
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="비밀번호 (6자 이상)"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <button type="submit" className="primary" disabled={busy}>
          {mode === 'login' ? '이메일로 로그인' : mode === 'signup' ? '이메일로 가입' : '재설정 메일 보내기'}
        </button>
      </form>
      {message && <p className="notice">{message}</p>}
      <p className="auth-links">
        {mode !== 'login' && <button type="button" className="link" onClick={() => setMode('login')}>로그인</button>}
        {mode !== 'signup' && <button type="button" className="link" onClick={() => setMode('signup')}>이메일로 가입</button>}
        {mode !== 'reset' && <button type="button" className="link" onClick={() => setMode('reset')}>비밀번호를 잊었어요</button>}
      </p>
      <p className="muted small">예전 크로스레슨 회원이라면 가입했던 이메일로 로그인하거나, 비밀번호 재설정을 해 주세요.</p>
    </div>
  )
}
