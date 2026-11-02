import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { deleteAccount } from '../services/accountService'
import { authErrorMessage } from '../services/authService'

// 프로필 화면 아래 "회원 탈퇴" (앱·웹 공통)
export default function DeleteAccountSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [agree, setAgree] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')

  async function onDelete() {
    setError('')
    try {
      await deleteAccount(user, setStep)
      navigate('/?deleted=1', { replace: true })
    } catch (e) {
      console.error(e)
      setStep('')
      const msg = e?.code?.startsWith('auth/') ? authErrorMessage(e) : null
      setError(msg === null ? '' : msg || '탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <section className="form narrow danger-zone" aria-labelledby="delete-title">
      <h2 id="delete-title">회원 탈퇴</h2>
      {!open ? (
        <p>
          <button type="button" className="link danger" onClick={() => setOpen(true)}>탈퇴하기</button>
        </p>
      ) : (
        <>
          <p>탈퇴하면 아래 내용이 <strong>모두 지워지고 되돌릴 수 없어요.</strong></p>
          <ul>
            <li>닉네임, 자기소개, 로그인 계정 정보</li>
            <li>내가 올린 레슨 (예전 크로스레슨에서 옮겨 온 글 포함)</li>
            <li>내가 보낸 신청과 내 레슨에 온 신청, 답장</li>
          </ul>
          <p className="muted small">
            자세한 내용은 <Link to="/privacy">개인정보처리방침</Link>을 확인해 주세요. 탈퇴 직전에 본인 확인을 위해 Google 계정을 한 번 더 선택해요.
          </p>
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            위 내용을 확인했고, 탈퇴할게요
          </label>
          {error && <p className="error">{error}</p>}
          <div className="actions spread">
            <button type="button" onClick={() => { setOpen(false); setAgree(false) }} disabled={Boolean(step)}>취소</button>
            <button type="button" className="danger-fill" disabled={!agree || Boolean(step)} onClick={onDelete}>
              {step || '탈퇴하기'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
