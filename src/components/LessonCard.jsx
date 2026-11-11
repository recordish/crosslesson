import { Link } from 'react-router-dom'
import { ageGroupsLabel, modeLabel, scheduleLabel } from '../data/lessonOptions'
import { fullDateTime, relativeTime } from '../utils/relativeTime'
import { ExchangeBadges } from './CategoryBadge'

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
      <p className="card-row">
        <span className={lesson.online ? 'mode online' : 'mode'}>{modeLabel(lesson)}</span>
        {place && <span className="card-ellipsis">📍 {place}</span>}
        <span className="card-age">👤 {ageGroupsLabel(lesson)}</span>
      </p>
      <p className="card-meta">
        <time dateTime={new Date(lesson.createdAt).toISOString()} title={fullDateTime(lesson.createdAt)}>
          {relativeTime(lesson.createdAt, now)}
        </time>
        <span>조회 {lesson.views.toLocaleString()}</span>
        <span className="card-schedule">🕒 {scheduleLabel(lesson.days, lesson.timeSlots)}</span>
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
