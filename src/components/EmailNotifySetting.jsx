import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getEmailOff, setEmailOff } from '../services/notifyService'

// 내 활동: 신청·답장 알림 메일 받기 켜기/끄기
export default function EmailNotifySetting() {
  const { user } = useAuth()
  const [on, setOn] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    getEmailOff(user.uid)
      .then((off) => alive && setOn(!off))
      .catch(() => alive && setOn(true))
    return () => {
      alive = false
    }
  }, [user.uid])

  async function toggle(e) {
    const next = e.target.checked
    setSaving(true)
    setOn(next)
    try {
      await setEmailOff(user.uid, !next)
    } catch (err) {
      console.error(err)
      setOn(!next)
      alert('설정을 저장하지 못했어요. 다시 시도해 주세요.')
    }
    setSaving(false)
  }

  if (on === null) return null
  return (
    <section className="notify-setting">
      <label>
        <input type="checkbox" checked={on} disabled={saving} onChange={toggle} />
        <span>
          <strong>알림 메일 받기</strong>
          <small>내 레슨에 신청이 오거나, 내 신청에 답장이 오면 Google 계정 이메일{user.email ? `(${user.email})` : ''}로 알려 드려요.</small>
        </span>
      </label>
    </section>
  )
}
