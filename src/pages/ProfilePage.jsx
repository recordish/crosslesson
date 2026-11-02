import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTitle } from '../hooks/useTitle'
import { logout } from '../services/authService'
import { INTRO_MAX, NICKNAME_MAX, NICKNAME_MIN, saveProfile } from '../services/profileService'

const safeNext = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/me')

// 닉네임·소개 정하기 (처음 로그인하면 여기로 옵니다)
export default function ProfilePage() {
  const { user, profile, setProfile } = useAuth()
  const navigate = useNavigate()
  const next = safeNext(useSearchParams()[0].get('next'))
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [intro, setIntro] = useState(profile?.intro ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useTitle(profile ? '프로필 수정' : '닉네임 정하기')

  const nameLength = [...nickname.trim()].length
  const nameOk = nameLength >= NICKNAME_MIN && nameLength <= NICKNAME_MAX

  async function onSubmit(e) {
    e.preventDefault()
    if (!nameOk) {
      setError(`닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 정해 주세요.`)
      return
    }
    setSaving(true)
    try {
      setProfile(await saveProfile(user.uid, { nickname, intro }, profile))
      navigate(next, { replace: true })
    } catch (err) {
      console.error(err)
      setError('저장하지 못했어요. 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  return (
    <form className="form narrow" onSubmit={onSubmit}>
      <h1 className="page-title">{profile ? '프로필 수정' : '반가워요! 닉네임을 정해 주세요'}</h1>
      <label htmlFor="nickname">
        <span>닉네임</span>
        <input id="nickname" value={nickname} maxLength={NICKNAME_MAX} onChange={(e) => setNickname(e.target.value)} placeholder="레슨과 신청에 보여요" />
      </label>
      <label htmlFor="intro">
        <span>자기소개 (선택)</span>
        <textarea id="intro" rows={4} maxLength={INTRO_MAX} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="예: 음대 바이올린 전공, 영상 편집 배우는 중" />
        <span className="counter">{intro.length} / {INTRO_MAX}</span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions spread">
        <button type="button" className="link" onClick={() => logout().then(() => navigate('/'))}>로그아웃</button>
        <button type="submit" className="primary" disabled={saving || !nameOk}>{saving ? '저장 중…' : '저장'}</button>
      </div>
      {!profile && (
        <p className="muted small">
          가입하면 <Link to="/privacy">개인정보처리방침</Link>에 동의하는 것으로 봅니다.
        </p>
      )}
    </form>
  )
}
