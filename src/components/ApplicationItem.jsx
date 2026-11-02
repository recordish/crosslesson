import { useState } from 'react'
import { Link } from 'react-router-dom'
import { answerApplication, REPLY_MAX, STATUS_LABEL } from '../services/applicationService'
import { fullDateTime, relativeTime } from '../utils/relativeTime'
import { ExchangeBadges } from './CategoryBadge'

// 신청 한 건.
// role: 'owner'(내 레슨에 들어온 신청 → 수락/거절 가능) | 'applicant'(내가 보낸 신청)
export default function ApplicationItem({ app, role, now, showLesson = true, onChanged, onCancel }) {
  const [reply, setReply] = useState(app.reply ?? '')
  const [saving, setSaving] = useState(false)

  async function answer(status) {
    setSaving(true)
    try {
      await answerApplication(app.id, status, reply)
      onChanged?.()
    } catch (e) {
      console.error(e)
      alert('저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="app">
      <div className="app-head">
        {showLesson && (
          <Link to={`/lesson/${app.lessonNo}`} className="app-lesson">
            <span className="muted">#{app.lessonNo}</span>
            <ExchangeBadges teach={app.lessonTeach} learns={app.lessonLearns} />
          </Link>
        )}
        <span className={`status s-${app.status}`}>{STATUS_LABEL[app.status]}</span>
      </div>
      <p className="app-from">
        {role === 'owner' ? <strong>{app.applicantName}</strong> : '내 신청'}
        <span className="muted" title={fullDateTime(app.createdAt)}> · {relativeTime(app.createdAt, now)}</span>
      </p>
      <p className="app-message">{app.message}</p>

      {app.reply && role === 'applicant' && (
        <div className="app-reply">
          <span className="muted">작성자 답장</span>
          <p>{app.reply}</p>
        </div>
      )}

      {role === 'owner' && (
        <div className="app-answer">
          <textarea
            value={reply}
            maxLength={REPLY_MAX}
            rows={2}
            placeholder="답장 (예: 수락할게요! 카톡 아이디는 ○○○ 입니다)"
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="actions">
            <button type="button" disabled={saving} onClick={() => answer('rejected')}>거절</button>
            <button type="button" className="primary" disabled={saving} onClick={() => answer('accepted')}>
              {app.status === 'accepted' ? '답장 저장' : '수락'}
            </button>
          </div>
        </div>
      )}

      {role === 'applicant' && onCancel && (
        <div className="actions">
          <button type="button" className="danger" onClick={() => onCancel(app)}>신청 취소</button>
        </div>
      )}
    </li>
  )
}
