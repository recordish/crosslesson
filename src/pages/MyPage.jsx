import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ApplicationItem from '../components/ApplicationItem'
import LessonCard from '../components/LessonCard'
import { useAuth } from '../contexts/AuthContext'
import { useNow } from '../hooks/useNow'
import { useTitle } from '../hooks/useTitle'
import { cancelApplication, getReceivedApplications, getSentApplications } from '../services/applicationService'
import { logout } from '../services/authService'
import { getLessonsByUser } from '../services/lessonService'

const TABS = [
  ['lessons', '내 레슨'],
  ['received', '받은 신청'],
  ['sent', '보낸 신청'],
]

export default function MyPage() {
  useTitle('내 활동')
  const { user, profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'lessons'
  const now = useNow(60000)
  const [items, setItems] = useState(null)

  const load = useCallback(() => {
    const fetchers = {
      lessons: () => getLessonsByUser(user.uid),
      received: () => getReceivedApplications(user.uid),
      sent: () => getSentApplications(user.uid),
    }
    return fetchers[tab]()
      .then(setItems)
      .catch((e) => {
        console.error(e)
        setItems([])
      })
  }, [tab, user.uid])

  useEffect(() => {
    setItems(null)
    load()
  }, [load])

  async function onCancel(app) {
    if (!confirm('신청을 취소할까요?')) return
    await cancelApplication(app.id)
    load()
  }

  const emptyText = {
    lessons: <>아직 등록한 레슨이 없어요. <Link to="/new">레슨 등록하기</Link></>,
    received: '아직 받은 신청이 없어요.',
    sent: <>아직 보낸 신청이 없어요. <Link to="/">레슨 둘러보기</Link></>,
  }

  return (
    <>
      <section className="me-head">
        <div>
          <strong className="me-name">{profile.nickname}</strong>
          {profile.intro && <p className="muted">{profile.intro}</p>}
        </div>
        <div className="actions">
          <Link to="/profile" className="button">프로필 수정</Link>
          <button type="button" onClick={logout}>로그아웃</button>
        </div>
      </section>

      <nav className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'tab active' : 'tab'}
            onClick={() => setParams({ tab: id }, { replace: true })}
          >
            {label}
          </button>
        ))}
      </nav>

      {items === null && <p className="empty">불러오는 중…</p>}
      {items?.length === 0 && <p className="empty">{emptyText[tab]}</p>}

      {tab === 'lessons' ? (
        <ul className="lesson-grid">
          {items?.map((l) => <LessonCard key={l.no} lesson={l} now={now} />)}
        </ul>
      ) : (
        <ul className="app-list">
          {items?.map((a) => (
            <ApplicationItem
              key={a.id}
              app={a}
              role={tab === 'received' ? 'owner' : 'applicant'}
              now={now}
              onChanged={load}
              onCancel={tab === 'sent' ? onCancel : undefined}
            />
          ))}
        </ul>
      )}
    </>
  )
}
