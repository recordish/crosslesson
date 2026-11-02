import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ApplicationItem from '../components/ApplicationItem'
import { ExchangeBadges } from '../components/CategoryBadge'
import { useAuth } from '../contexts/AuthContext'
import { ageLabel, categoryName } from '../data/categories'
import { useNow } from '../hooks/useNow'
import { useTitle } from '../hooks/useTitle'
import {
  apply,
  cancelApplication,
  getMyApplication,
  getReceivedApplications,
  MESSAGE_MAX,
  MESSAGE_MIN,
  STATUS_LABEL,
} from '../services/applicationService'
import { countView, deleteLesson, getLesson, setLessonClosed } from '../services/lessonService'
import { getProfile } from '../services/profileService'
import { fullDateTime, relativeTime } from '../utils/relativeTime'

export default function LessonPage() {
  const no = Number(useParams().no)
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const now = useNow(60000)
  const [lesson, setLesson] = useState(undefined) // undefined: 불러오는 중, null: 없음
  const [author, setAuthor] = useState(null)

  useTitle(lesson ? `${categoryName(lesson.teach)} ⇄ ${categoryName(lesson.learn)} 교환` : '레슨')

  const reload = useCallback(() => getLesson(no).then(setLesson), [no])

  useEffect(() => {
    if (!Number.isInteger(no) || no < 1) {
      setLesson(null)
      return
    }
    getLesson(no)
      .then(async (l) => {
        setLesson(l)
        if (!l) return
        if (await countView(no)) setLesson({ ...l, views: l.views + 1 })
        getProfile(l.uid).then(setAuthor).catch(() => {})
      })
      .catch((e) => {
        console.error(e)
        setLesson(null)
      })
  }, [no])

  if (lesson === undefined) return <p className="empty">불러오는 중…</p>
  if (lesson === null) {
    return (
      <p className="empty">
        레슨을 찾을 수 없어요. 삭제되었거나 주소가 잘못되었어요.
        <br />
        <Link to="/">레슨 목록으로</Link>
      </p>
    )
  }

  const isOwner = user?.uid === lesson.uid
  const place = [lesson.sido, lesson.region].filter(Boolean).join(' · ')

  async function onToggleClosed() {
    await setLessonClosed(no, !lesson.closed)
    reload()
  }

  async function onDelete() {
    if (!confirm('이 레슨을 삭제할까요? 되돌릴 수 없어요.')) return
    await deleteLesson(no)
    navigate('/me', { replace: true })
  }

  return (
    <article className="lesson">
      <p className="crumb"><Link to="/">레슨 찾기</Link> › #{lesson.no}</p>
      <div className="lesson-head">
        <ExchangeBadges teach={lesson.teach} learn={lesson.learn} />
        {lesson.closed && <span className="tag">모집 완료</span>}
      </div>

      <dl className="lesson-info">
        <div><dt>지역</dt><dd>{place || '협의'}</dd></div>
        <div><dt>나이대</dt><dd>{ageLabel(lesson.ageMin, lesson.ageMax)}</dd></div>
        <div>
          <dt>등록</dt>
          <dd title={fullDateTime(lesson.createdAt)}>{relativeTime(lesson.createdAt, now)}</dd>
        </div>
        <div><dt>조회</dt><dd>{lesson.views.toLocaleString()}</dd></div>
      </dl>

      <p className="lesson-content">{lesson.content}</p>

      <section className="author-box">
        <strong>{lesson.authorName}</strong>
        {author?.intro && <p>{author.intro}</p>}
      </section>

      {isOwner && (
        <div className="owner-actions">
          <Link to={`/lesson/${no}/edit`} className="button">수정</Link>
          <button type="button" onClick={onToggleClosed}>{lesson.closed ? '다시 모집하기' : '모집 완료로 바꾸기'}</button>
          <button type="button" className="danger" onClick={onDelete}>삭제</button>
        </div>
      )}

      {!authLoading &&
        (isOwner ? <ReceivedList lessonNo={no} uid={user.uid} now={now} /> : <ApplyBox lesson={lesson} now={now} />)}
    </article>
  )
}

// 작성자에게: 이 레슨에 들어온 신청
function ReceivedList({ lessonNo, uid, now }) {
  const [apps, setApps] = useState(null)
  const load = useCallback(
    () => getReceivedApplications(uid, lessonNo).then(setApps).catch(() => setApps([])),
    [uid, lessonNo],
  )
  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="section">
      <h2>받은 신청 {apps ? apps.length : ''}</h2>
      {apps === null && <p className="empty">불러오는 중…</p>}
      {apps?.length === 0 && <p className="empty">아직 들어온 신청이 없어요.</p>}
      <ul className="app-list">
        {apps?.map((a) => (
          <ApplicationItem key={a.id} app={a} role="owner" now={now} showLesson={false} onChanged={load} />
        ))}
      </ul>
    </section>
  )
}

// 방문자에게: 신청하기 / 내 신청 상태
function ApplyBox({ lesson, now }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [mine, setMine] = useState(undefined)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setMine(null)
      return
    }
    getMyApplication(lesson.no, user.uid).then(setMine).catch(() => setMine(null))
  }, [lesson.no, user])

  const next = encodeURIComponent(location.pathname)
  if (!user) {
    return (
      <section className="section apply-box">
        <h2>이 레슨에 신청하기</h2>
        <p>신청하려면 로그인이 필요해요.</p>
        <Link to={`/login?next=${next}`} className="button primary">로그인하고 신청하기</Link>
      </section>
    )
  }
  if (!profile) {
    return (
      <section className="section apply-box">
        <p>신청하기 전에 닉네임을 정해 주세요.</p>
        <Link to={`/profile?next=${next}`} className="button primary">닉네임 정하기</Link>
      </section>
    )
  }
  if (mine === undefined) return null

  if (mine) {
    return (
      <section className="section">
        <h2>내 신청 · {STATUS_LABEL[mine.status]}</h2>
        <ul className="app-list">
          <ApplicationItem
            app={mine}
            role="applicant"
            now={now}
            showLesson={false}
            onCancel={async (a) => {
              if (!confirm('신청을 취소할까요?')) return
              await cancelApplication(a.id)
              setMine(null)
            }}
          />
        </ul>
      </section>
    )
  }

  if (lesson.closed) {
    return <p className="notice">모집이 끝난 레슨이에요.</p>
  }

  const length = message.trim().length
  async function onSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await apply(user, profile, lesson, message)
      setMine(await getMyApplication(lesson.no, user.uid))
    } catch (err) {
      console.error(err)
      setError('신청하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="section apply-box" onSubmit={onSubmit}>
      <h2>이 레슨에 신청하기</h2>
      <p className="muted">
        내가 가르쳐 줄 수 있는 것, 가능한 시간과 장소, 연락 방법(카카오톡 아이디 등)을 적어 주세요.
        작성자만 볼 수 있어요.
      </p>
      <textarea
        value={message}
        rows={5}
        maxLength={MESSAGE_MAX}
        placeholder={`예: 안녕하세요! 영상 편집 3년 차입니다. ${categoryName(lesson.teach)} 배우고 싶어요. 주말 오후 가능해요.`}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="form-foot">
        <span className="counter">{length} / {MESSAGE_MAX}</span>
        <button type="submit" className="primary" disabled={sending || length < MESSAGE_MIN}>
          {sending ? '보내는 중…' : '신청 보내기'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
