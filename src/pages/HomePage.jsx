import { Link, useSearchParams } from 'react-router-dom'
import CategorySelect from '../components/CategorySelect'
import LessonCard from '../components/LessonCard'
import { SIDO } from '../data/categories'
import { useLessons } from '../hooks/useLessons'
import { useNow } from '../hooks/useNow'
import { useTitle } from '../hooks/useTitle'

// 레슨 찾기. 필터는 주소에 남겨서(?teach=204&learn=306&sido=서울) 공유·뒤로 가기가 됩니다.
// 예전 주소 class.php?d=204 → /?teach=204, learn.php?d=306 → /?learn=306 으로 연결됩니다(LegacyRedirect).
export default function HomePage() {
  useTitle('')
  const [params, setParams] = useSearchParams()
  const teach = Number(params.get('teach')) || 0
  const learn = Number(params.get('learn')) || 0
  const sido = params.get('sido') ?? ''
  const { lessons, loading, error, hasMore, loadMore } = useLessons({ teach, learn, sido })
  const now = useNow(60000)
  const filtered = Boolean(teach || learn || sido)

  function setFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <>
      <section className="hero">
        <h1>가르치고, 배우고.<br />재능을 맞바꿔요</h1>
        <p>내가 잘하는 것을 가르쳐 주고, 배우고 싶은 것을 배워요. 돈 대신 재능으로.</p>
        <Link to="/new" className="button primary">내 레슨 등록하기</Link>
      </section>

      <section className="filters" aria-label="레슨 검색 조건">
        <label>
          <span>배우고 싶은 과목</span>
          <CategorySelect value={teach} onChange={(v) => setFilter('teach', v)} emptyLabel="전체" />
        </label>
        <label>
          <span>가르쳐 줄 수 있는 과목</span>
          <CategorySelect value={learn} onChange={(v) => setFilter('learn', v)} emptyLabel="전체" />
        </label>
        <label>
          <span>지역</span>
          <select value={sido} onChange={(e) => setFilter('sido', e.target.value)}>
            <option value="">전체</option>
            {SIDO.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        {filtered && (
          <button type="button" className="link" onClick={() => setParams({}, { replace: true })}>
            조건 지우기
          </button>
        )}
      </section>

      {error && <p className="error">레슨을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
      {!loading && !error && lessons.length === 0 && (
        <p className="empty">
          {filtered ? '조건에 맞는 레슨이 아직 없어요.' : '아직 등록된 레슨이 없어요.'}
          <br />
          <Link to="/new">첫 레슨을 등록해 보세요</Link>
        </p>
      )}

      <ul className="lesson-grid">
        {lessons.map((l) => (
          <LessonCard key={l.no} lesson={l} now={now} />
        ))}
      </ul>

      {loading && <p className="empty">불러오는 중…</p>}
      {!loading && hasMore && (
        <div className="more">
          <button type="button" onClick={loadMore}>더 보기</button>
        </div>
      )}
    </>
  )
}
