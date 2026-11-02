import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CategorySelect from '../components/CategorySelect'
import { useAuth } from '../contexts/AuthContext'
import { SIDO } from '../data/categories'
import { useTitle } from '../hooks/useTitle'
import {
  CONTENT_MAX,
  CONTENT_MIN,
  createLesson,
  getLesson,
  REGION_MAX,
  updateLesson,
} from '../services/lessonService'

const EMPTY = { teach: 0, learn: 0, sido: '', region: '', ageMin: '', ageMax: '', content: '', closed: false }

const toAge = (v) => (v === '' || v == null ? null : Number(v))

// 새 레슨 등록(/new)과 수정(/lesson/:no/edit)을 함께 맡습니다.
export default function LessonFormPage() {
  const params = useParams()
  const editNo = params.no ? Number(params.no) : null
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(editNo ? null : EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useTitle(editNo ? '레슨 수정' : '레슨 등록')

  useEffect(() => {
    if (!editNo) return
    getLesson(editNo).then((l) => {
      if (!l || l.uid !== user.uid) {
        navigate(`/lesson/${editNo}`, { replace: true })
        return
      }
      setForm({ ...l, ageMin: l.ageMin ?? '', ageMax: l.ageMax ?? '' })
    })
  }, [editNo, user.uid, navigate])

  if (!form) return <p className="empty">불러오는 중…</p>

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const contentLength = form.content.trim().length

  function validate() {
    if (!form.teach) return '가르쳐 줄 수 있는 과목을 골라 주세요.'
    if (!form.learn) return '배우고 싶은 과목을 골라 주세요.'
    const min = toAge(form.ageMin)
    const max = toAge(form.ageMax)
    const bad = (a) => a != null && (!Number.isInteger(a) || a < 10 || a > 99)
    if (bad(min) || bad(max)) return '나이는 10에서 99 사이 숫자로 적어 주세요.'
    if (min != null && max != null && min > max) return '나이대의 앞 숫자가 뒤 숫자보다 클 수 없어요.'
    if (contentLength < CONTENT_MIN) return `소개를 ${CONTENT_MIN}자 이상 적어 주세요.`
    return ''
  }

  async function onSubmit(e) {
    e.preventDefault()
    const problem = validate()
    setError(problem)
    if (problem) return
    setSaving(true)
    const fields = { ...form, ageMin: toAge(form.ageMin), ageMax: toAge(form.ageMax) }
    try {
      const no = editNo ?? (await createLesson(user, profile, fields))
      if (editNo) await updateLesson(editNo, fields)
      navigate(`/lesson/${no}`, { replace: true })
    } catch (err) {
      console.error(err)
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <h1 className="page-title">{editNo ? `레슨 #${editNo} 수정` : '레슨 등록'}</h1>

      <div className="row">
        <label htmlFor="teach">
          <span>가르쳐 줄 수 있어요</span>
          <CategorySelect id="teach" value={form.teach} onChange={set('teach')} emptyLabel="과목 선택" required />
        </label>
        <span className="swap big" aria-hidden="true">⇄</span>
        <label htmlFor="learn">
          <span>배우고 싶어요</span>
          <CategorySelect id="learn" value={form.learn} onChange={set('learn')} emptyLabel="과목 선택" required />
        </label>
      </div>

      <div className="row">
        <label htmlFor="sido">
          <span>지역</span>
          <select id="sido" value={form.sido} onChange={(e) => set('sido')(e.target.value)}>
            <option value="">선택 안 함</option>
            {SIDO.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label htmlFor="region" className="grow">
          <span>만날 장소 (선택)</span>
          <input
            id="region"
            value={form.region}
            maxLength={REGION_MAX}
            placeholder="예: 오리역 근처, 강남역, 줌 화상"
            onChange={(e) => set('region')(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="ages">
        <legend>희망 나이대 (선택, 비워 두면 나이 무관)</legend>
        <input type="number" inputMode="numeric" min="10" max="99" aria-label="최소 나이" value={form.ageMin} onChange={(e) => set('ageMin')(e.target.value)} />
        <span>~</span>
        <input type="number" inputMode="numeric" min="10" max="99" aria-label="최대 나이" value={form.ageMax} onChange={(e) => set('ageMax')(e.target.value)} />
        <span>세</span>
      </fieldset>

      <label htmlFor="content">
        <span>소개</span>
        <textarea
          id="content"
          rows={8}
          maxLength={CONTENT_MAX}
          value={form.content}
          placeholder={'어떤 걸 얼마나 가르쳐 줄 수 있는지, 무엇을 배우고 싶은지, 가능한 요일과 시간을 적어 주세요.'}
          onChange={(e) => set('content')(e.target.value)}
        />
        <span className="counter">{contentLength} / {CONTENT_MAX}</span>
      </label>

      {editNo && (
        <label className="check">
          <input type="checkbox" checked={form.closed} onChange={(e) => set('closed')(e.target.checked)} />
          모집 완료 (목록에는 남지만 새 신청을 받지 않아요)
        </label>
      )}

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <Link to={editNo ? `/lesson/${editNo}` : '/'} className="button">취소</Link>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? '저장 중…' : editNo ? '수정 완료' : '등록하기'}
        </button>
      </div>
    </form>
  )
}
