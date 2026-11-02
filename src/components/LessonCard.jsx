import { Link } from 'react-router-dom'
import { ageLabel } from '../data/categories'
import { fullDateTime, relativeTime } from '../utils/relativeTime'
import { ExchangeBadges } from './CategoryBadge'

export default function LessonCard({ lesson, now }) {
  const place = [lesson.sido, lesson.region].filter(Boolean).join(' · ')
  return (
    <li className={lesson.closed ? 'card closed' : 'card'}>
      <Link to={`/lesson/${lesson.no}`} className="card-link">
        <div className="card-top">
          <ExchangeBadges teach={lesson.teach} learn={lesson.learn} />
          {lesson.closed && <span className="tag">모집 완료</span>}
        </div>
        <p className="card-content">{lesson.content}</p>
        <p className="card-place">
          {place && <span>📍 {place}</span>}
          <span>{ageLabel(lesson.ageMin, lesson.ageMax)}</span>
        </p>
        <p className="card-meta">
          <span className="author">{lesson.authorName}</span>
          <time dateTime={new Date(lesson.createdAt).toISOString()} title={fullDateTime(lesson.createdAt)}>
            {relativeTime(lesson.createdAt, now)}
          </time>
          <span>조회 {lesson.views.toLocaleString()}</span>
        </p>
      </Link>
    </li>
  )
}
