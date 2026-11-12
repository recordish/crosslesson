import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTitle } from '../hooks/useTitle'
import { getNicknames, isAdmin, listApplications, listMembers, listVisits, MAX_VISITS, purgeOldVisits } from '../services/adminService'
import { displayName } from '../data/displayName.js'
import { categoryName } from '../data/categories'
import { setNoTrack } from '../services/analytics'

const PERIODS = [
  { key: 'today', label: '오늘' },
  { key: '7', label: '7일' },
  { key: '30', label: '30일' },
  { key: '90', label: '90일' },
]

function sinceOf(key) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (key !== 'today') d.setDate(d.getDate() - (Number(key) - 1))
  return d.getTime()
}

const SEARCH = [
  [/(^|\.)google\./, 'Google'], [/(^|\.)naver\.com$/, '네이버'], [/(^|\.)daum\.net$/, '다음'], [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)yahoo\./, 'Yahoo'], [/duckduckgo\.com$/, 'DuckDuckGo'], [/(^|\.)zum\.com$/, '줌'], [/(^|\.)nate\.com$/, '네이트'],
]
const SOCIAL = [
  [/instagram\.com$/, '인스타그램'], [/facebook\.com$|fb\.com$/, '페이스북'], [/kakao\.com$|kakaocdn/, '카카오'],
  [/^t\.co$|twitter\.com$|^x\.com$/, 'X(트위터)'], [/youtube\.com$|youtu\.be$/, '유튜브'], [/band\.us$/, '밴드'],
  [/threads\.(net|com)$/, '스레드'], [/blog\.naver\.com$|cafe\.naver\.com$/, '네이버 블로그·카페'],
]

// 세션 첫 화면 기록으로 유입 채널을 정합니다.
function channelOf(v) {
  if (v.source) return { channel: '캠페인(UTM)', detail: [v.source, v.medium, v.campaign].filter(Boolean).join(' / ') }
  const ref = v.ref || ''
  if (ref) {
    for (const [re, name] of SOCIAL) if (re.test(ref)) return { channel: 'SNS·커뮤니티', detail: name }
    for (const [re, name] of SEARCH) if (re.test(ref)) return { channel: '검색', detail: name }
    if (ref.includes('crosslesson') || ref.includes('croesson2026')) return { channel: '내부 이동', detail: ref }
    return { channel: '다른 사이트', detail: ref }
  }
  if (v.app) return { channel: '안드로이드 앱', detail: '앱' }
  return { channel: '직접 방문', detail: '주소 입력·즐겨찾기·메신저 등' }
}

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['ko'], { type: 'region' }) : null
const languageNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['ko'], { type: 'language' }) : null
const countryName = (c) => (c ? `${regionNames?.of(c) ?? c} (${c})` : '알 수 없음')
const languageName = (l) => {
  if (!l) return '알 수 없음'
  try {
    return `${languageNames?.of(l.split('-')[0]) ?? l} (${l})`
  } catch {
    return l
  }
}
const DEVICE = { mobile: '휴대폰', tablet: '태블릿', desktop: 'PC' }
const pageName = (p) => (/^\/lesson\/\d+$/.test(p) ? '레슨 상세 /lesson/…' : /^\/lesson\/\d+\/edit$/.test(p) ? '레슨 수정' : p)

function countBy(items, keyFn) {
  const m = new Map()
  for (const it of items) {
    const k = keyFn(it)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function summarize(visits) {
  const bySession = new Map()
  for (const v of [...visits].sort((a, b) => a.t - b.t)) {
    const s = bySession.get(v.sid)
    if (s) {
      s.pages += 1
      if (!s.uid && v.uid) s.uid = v.uid
    } else bySession.set(v.sid, { ...v, uid: v.uid || '', ...channelOf(v), pages: 1 })
  }
  const sessions = [...bySession.values()]
  // 로그인하기 전 방문도 같은 기기(방문자 번호)에서 로그인한 기록이 있으면 그 회원으로 봅니다.
  const vidUid = new Map()
  for (const v of visits) if (v.uid && !vidUid.has(v.vid)) vidUid.set(v.vid, v.uid)
  for (const s of sessions) if (!s.uid && vidUid.has(s.vid)) { s.uid = vidUid.get(s.vid); s.uidGuess = true }
  const days = countBy(sessions, (s) => new Date(s.t).toLocaleDateString('sv-SE')).sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return {
    pageviews: visits.length,
    sessions,
    visitors: new Set(visits.map((v) => v.vid)).size,
    newVisitors: sessions.filter((s) => s.newVisitor).length,
    days,
    channels: countBy(sessions, (s) => s.channel),
    sources: countBy(sessions.filter((s) => !['직접 방문', '안드로이드 앱'].includes(s.channel)), (s) => `${s.channel} · ${s.detail}`),
    refPages: countBy(sessions.filter((s) => s.ref && s.channel !== '내부 이동'), (s) => s.ref + (s.refPath && s.refPath !== '/' ? s.refPath : '')),
    entries: countBy(sessions, (s) => pageName(s.path)),
    pages: countBy(visits, (v) => pageName(v.path)),
    countries: countBy(sessions, (s) => countryName(s.country)),
    languages: countBy(sessions, (s) => languageName(s.lang)),
    devices: countBy(sessions, (s) => DEVICE[s.device] ?? s.device),
    os: countBy(sessions, (s) => s.os),
    browsers: countBy(sessions, (s) => s.browser),
    keywords: countBy(sessions.filter((s) => s.keyword), (s) => `${s.keyword} (${s.detail})`),
    unknownUa: countBy(visits.filter((v) => v.ua), (v) => v.ua),
    platforms: countBy(sessions, (s) => (s.app ? '안드로이드 앱' : '웹')),
    signedIn: sessions.filter((s) => s.signedIn).length,
  }
}

function Table({ title, rows, total, unit = '방문', limit = 10 }) {
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, limit)
  return (
    <section className="admin-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">기록이 없어요.</p>
      ) : (
        <table className="admin-table">
          <tbody>
            {shown.map(([name, n]) => (
              <tr key={name}>
                <td className="admin-name">
                  <span className="admin-bar" style={{ width: `${(n / rows[0][1]) * 100}%` }} />
                  <span>{name}</span>
                </td>
                <td className="admin-num">{n.toLocaleString()}</td>
                <td className="admin-pct">{total ? `${Math.round((n / total) * 100)}%` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows.length > limit && (
        <button type="button" className="admin-more" onClick={() => setAll(!all)}>
          {all ? '접기' : `전체 ${rows.length}개 보기`}
        </button>
      )}
      <p className="admin-unit">단위: {unit}</p>
    </section>
  )
}

export default function AdminPage() {
  useTitle('관리자')
  const { user } = useAuth()
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    let alive = true
    isAdmin(user?.uid).then((ok) => {
      if (!alive) return
      setAllowed(ok)
      if (ok) {
        setNoTrack()
        purgeOldVisits().catch((e) => console.warn('오래된 기록 정리 실패:', e))
      }
    })
    return () => {
      alive = false
    }
  }, [user?.uid])

  if (allowed === null) return <p className="empty">확인하는 중…</p>
  if (!allowed) return <p className="empty">이 페이지를 볼 권한이 없어요.</p>

  return (
    <div className="admin">
      <AdminNav />
      <section id="admin-members" className="admin-section">
        <MembersView />
      </section>
      <hr className="admin-divider" />
      <section id="admin-apps" className="admin-section">
        <ApplicationsView />
      </section>
      <hr className="admin-divider" />
      <section id="admin-visits" className="admin-section">
        <VisitsView />
      </section>
    </div>
  )
}

const NAV = [
  { id: 'admin-members', label: '회원' },
  { id: 'admin-apps', label: '신청' },
  { id: 'admin-visits', label: '방문' },
  { id: 'admin-recent', label: '최근' },
  { id: 'admin-sources', label: '유입' },
]

// 화면 위에 붙는 메뉴: 누르면 그 영역으로 이동하고, 지금 보고 있는 영역을 표시합니다.
function AdminNav() {
  const [active, setActive] = useState(NAV[0].id)
  const [top, setTop] = useState(0)

  useEffect(() => {
    const header = document.querySelector('.header')
    const update = () => setTop(header?.offsetHeight ?? 0)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const line = top + 70
      let current = NAV[0].id
      for (const n of NAV) {
        const el = document.getElementById(n.id)
        if (el && el.getBoundingClientRect().top <= line) current = n.id
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = NAV.at(-1).id
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [top])

  function go(id) {
    const el = document.getElementById(id)
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - top - 56, behavior: 'instant' })
  }

  return (
    <nav className="admin-tabs" style={{ top }}>
      {NAV.map((n) => (
        <button key={n.id} type="button" className={active === n.id ? 'on' : ''} onClick={() => go(n.id)}>
          {n.label}
        </button>
      ))}
    </nav>
  )
}

function VisitsView() {
  const [nicknames, setNicknames] = useState({})
  const [period, setPeriod] = useState('7')
  const [visits, setVisits] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setVisits(null)
    setError('')
    listVisits(sinceOf(period))
      .then(async (v) => {
        if (!alive) return
        setVisits(v)
        const names = await getNicknames(v.map((x) => x.uid))
        if (alive) setNicknames(names)
      })
      .catch((e) => {
        console.error(e)
        if (alive) setError('접속 기록을 불러오지 못했어요.')
      })
    return () => {
      alive = false
    }
  }, [period])

  const s = useMemo(() => (visits ? summarize(visits) : null), [visits])

  const total = s?.sessions.length ?? 0
  const maxDay = Math.max(1, ...(s?.days.map((d) => d[1]) ?? [1]))

  return (
    <>
      <div className="admin-head">
        <h1>접속 기록</h1>
        <div className="admin-periods" role="tablist">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" className={period === p.key ? 'chip on' : 'chip'} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!s && !error && <p className="empty">불러오는 중…</p>}
      {s && (
        <>
          {visits.length >= MAX_VISITS && (
            <p className="error">최근 {MAX_VISITS.toLocaleString()}건까지만 집계했어요. 기간을 줄여 보세요.</p>
          )}
          <div className="admin-stats">
            <div><strong>{s.visitors.toLocaleString()}</strong><span>방문자</span></div>
            <div><strong>{total.toLocaleString()}</strong><span>방문(세션)</span></div>
            <div><strong>{s.pageviews.toLocaleString()}</strong><span>페이지뷰</span></div>
            <div><strong>{total ? Math.round((s.newVisitors / total) * 100) : 0}%</strong><span>첫 방문</span></div>
            <div><strong>{total ? (s.pageviews / total).toFixed(1) : 0}</strong><span>방문당 화면</span></div>
            <div><strong>{total ? Math.round((s.signedIn / total) * 100) : 0}%</strong><span>로그인 상태</span></div>
          </div>

          {s.days.length > 1 && (
            <section className="admin-card">
              <h2>날짜별 방문</h2>
              <div className="admin-days">
                {s.days.map(([day, n]) => (
                  <div key={day} className="admin-day" title={`${day}: ${n}`}>
                    <span className="admin-day-n">{n}</span>
                    <span className="admin-day-bar" style={{ height: `${(n / maxDay) * 100}%` }} />
                    <span className="admin-day-label">{day.slice(5).replace('-', '/')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="admin-card" id="admin-recent">
            <h2>최근 방문</h2>
            <div className="table-wrap">
              <table className="admin-recent admin-stack recent">
                <thead>
                  <tr><th>시각</th><th>닉네임</th><th>유입</th><th>첫 화면</th><th>화면 수</th><th>국가</th><th>언어</th><th>기기</th></tr>
                </thead>
                <tbody>
                  {[...s.sessions].reverse().slice(0, 50).map((v) => (
                    <tr key={v.sid}>
                      <td className="c-time">{new Date(v.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="c-nick">
                        {v.uid ? (
                          <span className={v.uidGuess ? 'muted' : ''} title={v.uidGuess ? '같은 기기에서 로그인한 회원 (이 방문은 로그인 전)' : ''}>
                            {nicknames[v.uid] ? displayName(nicknames[v.uid]) : '회원'}{v.uidGuess ? ' *' : ''}
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td className="c-src">{v.channel === v.detail ? v.channel : `${v.channel} · ${v.detail}`}{v.keyword ? ` · "${v.keyword}"` : ''}</td>
                      <td className="c-page">{pageName(v.path)}</td>
                      <td className="c-pages">{v.pages}</td>
                      <td className="c-meta">{v.country || '-'}</td>
                      <td className="c-meta">{v.lang || '-'}</td>
                      <td className="c-meta c-dev">{[DEVICE[v.device], v.os, v.browser].filter(Boolean).join(' · ')}{v.newVisitor ? ' · 첫 방문' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="admin-grid" id="admin-sources">
            <Table title="유입 채널" rows={s.channels} total={total} />
            <Table title="유입 출처" rows={s.sources} total={total} />
            <Table title="유입 검색어 (검색 사이트가 넘겨 준 것만)" rows={s.keywords} total={total} />
            <Table title="들어온 페이지(외부 링크)" rows={s.refPages} total={total} />
            <Table title="첫 화면" rows={s.entries} total={total} />
            <Table title="많이 본 화면" rows={s.pages} total={s.pageviews} unit="페이지뷰" />
            <Table title="국가(추정)" rows={s.countries} total={total} />
            <Table title="언어" rows={s.languages} total={total} />
            <Table title="웹 / 앱" rows={s.platforms} total={total} />
            <Table title="기기" rows={s.devices} total={total} />
            <Table title="운영체제" rows={s.os} total={total} />
            <Table title="브라우저" rows={s.browsers} total={total} />
            <Table title="분류 못한 기기 원문 (기타·Linux PC)" rows={s.unknownUa} unit="페이지뷰" limit={5} />
          </div>
        </>
      )}
    </>
  )
}

const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-')
const fmtDateTime = (t) =>
  t ? new Date(t).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
const DAY = 24 * 3600 * 1000

function MembersView() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [kind, setKind] = useState('new')

  useEffect(() => {
    let alive = true
    listMembers()
      .then((r) => alive && setRows(r))
      .catch((e) => {
        console.error(e)
        if (alive) setError('회원 목록을 불러오지 못했어요.')
      })
    return () => {
      alive = false
    }
  }, [])

  const now = Date.now()
  const fresh = rows?.filter((r) => !r.legacy) ?? []
  const returning = rows?.filter((r) => r.legacy) ?? []
  const shown = kind === 'new' ? fresh : returning

  return (
    <>
      <div className="admin-head">
        <h1>회원</h1>
        <div className="admin-periods">
          <button type="button" className={kind === 'new' ? 'chip on' : 'chip'} onClick={() => setKind('new')}>신규 가입</button>
          <button type="button" className={kind === 'legacy' ? 'chip on' : 'chip'} onClick={() => setKind('legacy')}>돌아온 기존 회원</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {!rows && !error && <p className="empty">불러오는 중…</p>}
      {rows && (
        <>
          <div className="admin-stats">
            <div><strong>{fresh.length.toLocaleString()}</strong><span>신규 가입 (전체)</span></div>
            <div><strong>{fresh.filter((r) => r.joinedAt >= now - 7 * DAY).length}</strong><span>최근 7일 가입</span></div>
            <div><strong>{fresh.filter((r) => r.joinedAt >= now - 30 * DAY).length}</strong><span>최근 30일 가입</span></div>
          </div>
          <section className="admin-card">
            <h2>{kind === 'new' ? '신규 가입자' : '돌아온 기존 회원'} ({shown.length})</h2>
            {shown.length === 0 ? (
              <p className="muted">아직 없어요.</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-recent admin-stack members">
                  <thead>
                    <tr><th>가입일</th><th>닉네임</th><th>이메일</th><th>최근 로그인</th><th>레슨</th><th>소개</th></tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.uid}>
                        <td className="c-date">{fmtDate(r.joinedAt)}</td>
                        <td className="c-nick">{r.nickname || <span className="muted">미설정</span>}</td>
                        <td className="c-email">{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : '-'}</td>
                        <td className="c-login">{fmtDateTime(r.lastLoginAt)}</td>
                        <td className="c-lessons">{r.lessons}</td>
                        <td className="admin-intro c-intro">{r.intro || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}

const APP_STATUS = { pending: '답변 대기', accepted: '수락', rejected: '거절' }

// 레슨 신청 현황 (읽기만)
function ApplicationsView() {
  const [apps, setApps] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let alive = true
    listApplications()
      .then((a) => alive && setApps(a))
      .catch((e) => {
        console.error(e)
        if (alive) setError('레슨 신청을 불러오지 못했어요.')
      })
    return () => {
      alive = false
    }
  }, [])

  const now = Date.now()
  const count = (fn) => apps?.filter(fn).length ?? 0

  return (
    <>
      <div className="admin-head">
        <h1>레슨 신청</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {!apps && !error && <p className="empty">불러오는 중…</p>}
      {apps && (
        <>
          <div className="admin-stats">
            <div><strong>{apps.length}</strong><span>{apps.length >= 200 ? '최근 신청 200건' : '전체 신청'}</span></div>
            <div><strong>{count((a) => a.createdAt >= now - 7 * DAY)}</strong><span>최근 7일</span></div>
            <div><strong>{count((a) => a.status === 'pending')}</strong><span>답변 대기</span></div>
            <div><strong>{count((a) => a.status === 'accepted')}</strong><span>수락</span></div>
            <div><strong>{count((a) => a.status === 'rejected')}</strong><span>거절</span></div>
          </div>
          <section className="admin-card">
            <h2>최근 신청 ({apps.length})</h2>
            {apps.length === 0 ? (
              <p className="muted">아직 신청이 없어요.</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-recent admin-stack apps">
                  <thead>
                    <tr><th>신청일</th><th>신청자</th><th>레슨</th><th>작성자</th><th>상태</th><th>메시지</th></tr>
                  </thead>
                  <tbody>
                    {apps.map((a) => (
                      <tr key={a.id}>
                        <td className="c-date">{fmtDateTime(a.createdAt)}</td>
                        <td className="c-nick">{displayName(a.applicantName)}</td>
                        <td className="c-lesson">
                          <a href={`/lesson/${a.lessonNo}`} target="_blank" rel="noreferrer">#{a.lessonNo}</a>{' '}
                          <ExchangeText teach={a.lessonTeach} learns={a.lessonLearns} />
                        </td>
                        <td className="c-owner">{displayName(a.ownerName)}</td>
                        <td className="c-status"><span className={`status s-${a.status}`}>{APP_STATUS[a.status] ?? a.status}</span></td>
                        <td className="c-msg">
                          <button type="button" className="admin-msg" onClick={() => setOpen(open === a.id ? null : a.id)}>
                            {open === a.id ? a.message : a.message.length > 40 ? a.message.slice(0, 40) + '…' : a.message}
                          </button>
                          {open === a.id && a.reply && <p className="admin-reply">답장: {a.reply}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}

function ExchangeText({ teach, learns }) {
  const t = teach ? categoryName(teach) : ''
  const l = (learns ?? []).map(categoryName).join(', ')
  return <span className="muted">{t && l ? `${t} ⇄ ${l}` : t || l}</span>
}
