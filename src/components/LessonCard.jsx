import { Link } from 'react-router-dom'
import { ageLabel } from '../data/categories'
import { modeLabel, scheduleLabel } from '../data/lessonOptions'
import { fullDateTime, relativeTime } from '../utils/relativeTime'
import { ExchangeBadges } from './CategoryBadge'
import { displayName } from '../data/displayName.js'

// 레슨 카드. preview 이면 링크 없이 보여줍니다 (등록 화면의 "이렇게 보여요").
export default function LessonCard({ lesson, now, preview = false }) {
  const place = lesson.offline ? [lesson.sido, lesson.region].filter(Boolean).join(' · ') : lesson.region
  const body = (
    <>
      <div className="card-top">
        <ExchangeBadges teach={lesson.teach} learns={lesson.learns} placeholder={preview} />
        {lesson.closed && <span className="tag">모집 완료</span>}
      </div>
      <p className="card-content">{lesson.content || <span className="muted">소개 글이 여기에 보여요.</span>}</p>
      <p className="card-place">
        <span className={lesson.online ? 'mode online' : 'mode'}>{modeLabel(lesson)}</span>
        {place && <span>📍 {place}</span>}
        <span>🕒 {scheduleLabel(lesson.days, lesson.timeSlots)}</span>
        <span>{ageLabel(lesson.ageMin, lesson.ageMax)}</span>
      </p>
      <p className="card-meta">
        <span className="author">{displayName(lesson.authorName)}</span>
        <time dateTime={new Date(lesson.createdAt).toISOString()} title={fullDateTime(lesson.createdAt)}>
          {relativeTime(lesson.createdAt, now)}
        </time>
        <span>조회 {lesson.views.toLocaleString()}</span>
      </p>
    </>
  )
  const Wrapper = preview ? 'div' : 'li'
  return (
    <Wrapper className={`card${lesson.closed ? ' closed' : ''}${preview ? ' preview' : ''}`}>
      {preview ? <div className="card-link">{body}</div> : <Link to={`/lesson/${lesson.no}`} className="card-link">{body}</Link>}
    </Wrapper>
  )
}
