import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CategoryPicker from '../components/CategoryPicker'
import ChipGroup from '../components/ChipGroup'
import LessonCard from '../components/LessonCard'
import { useAuth } from '../contexts/AuthContext'
import { categoryName, SIDO } from '../data/categories'
import {
  DAYS,
  LEARN_LEVELS,
  MAX_LEARNS,
  MODES,
  modeFlags,
  modeOf,
  TEACH_LEVELS,
  TIME_SLOTS,
  WEEKDAYS,
  WEEKEND,
} from '../data/lessonOptions'
import { useTitle } from '../hooks/useTitle'
import {
  CONTENT_MAX,
  CONTENT_MIN,
  createLesson,
  getLesson,
  pickFields,
  REGION_MAX,
  updateLesson,
} from '../services/lessonService'

const EMPTY = {
  teach: 0, learns: [], teachLevel: '', learnLevel: '',
  mode: 'offline', sido: '', region: '',
  days: [], timeSlots: [],
  anyAge: true, ageMin: '', ageMax: '',
  content: '', closed: false,
}

// 입력 칸 순서 (오류가 있으면 이 순서로 첫 칸에 초점을 옮깁니다)
const FIELD_ORDER = ['teach', 'learns', 'ages', 'content']

// 소개 글은 누구나 볼 수 있어서, 연락처로 보이는 내용이 있으면 경고합니다.
const CONTACT_PATTERNS = [
  /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/, // 휴대폰 번호
  /open\.kakao\.com/i, // 오픈채팅 링크
  /(카톡|카카오톡|kakao(talk)?)\s*(아이디|id)?\s*[:：]?\s*[a-z0-9_.-]{4,}/i,
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i, // 이메일
]
const looksLikeContact = (text) => CONTACT_PATTERNS.some((re) => re.test(text))

const toAge = (v) => (v === '' || v == null ? null : Number(v))
const draftKey = (uid) => `crosslesson:draft:${uid}`

function template(form) {
  const teach = form.teach ? categoryName(form.teach) : '○○'
  const learn = form.learns.length ? form.learns.map(categoryName).join(', ') : '○○'
  return `[가르쳐 줄 수 있는 것]
${teach}: 경력이나 실력, 어디까지 알려 줄 수 있는지 적어 주세요.

[배우고 싶은 것]
${learn}: 지금 내 수준과 배우고 싶은 내용을 적어 주세요.

[진행 방법]
예: 주 1회, 1시간씩 번갈아 가르쳐 주기`
}

// 저장할 값으로 바꿉니다 (미리보기와 저장이 같은 결과가 되도록).
function toFields(form) {
  return pickFields({
    ...form,
    ...modeFlags(form.mode),
    ageMin: form.anyAge ? null : toAge(form.ageMin),
    ageMax: form.anyAge ? null : toAge(form.ageMax),
  })
}

function validate(form) {
  const errors = {}
  if (!form.teach) errors.teach = '가르쳐 줄 수 있는 과목을 골라 주세요.'
  if (form.learns.length === 0) errors.learns = '배우고 싶은 과목을 하나 이상 골라 주세요.'
  if (!form.anyAge) {
    const min = toAge(form.ageMin)
    const max = toAge(form.ageMax)
    const bad = (a) => a != null && (!Number.isInteger(a) || a < 10 || a > 99)
    if (min == null && max == null) errors.ages = '나이를 적거나 "나이 무관"을 체크해 주세요.'
    else if (bad(min) || bad(max)) errors.ages = '나이는 10에서 99 사이 숫자로 적어 주세요.'
    else if (min != null && max != null && min > max) errors.ages = '앞 숫자가 뒤 숫자보다 클 수 없어요.'
  }
  const length = form.content.trim().length
  if (length < CONTENT_MIN) errors.content = `소개를 ${CONTENT_MIN}자 이상 적어 주세요. (지금 ${length}자)`
  return errors
}

function FieldError({ id, message }) {
  return message ? <p id={id} className="field-error" role="alert">{message}</p> : null
}

// 새 레슨 등록(/new)과 수정(/lesson/:no/edit)을 함께 맡습니다.
export default function LessonFormPage() {
  const params = useParams()
  const editNo = params.no ? Number(params.no) : null
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(editNo ? null : EMPTY)
  const [initial, setInitial] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [draft, setDraft] = useState(null) // 불러올 수 있는 임시 저장 글
  const saveTimer = useRef(null)
  useTitle(editNo ? '레슨 수정' : '레슨 등록')

  // 수정: 기존 레슨 불러오기
  useEffect(() => {
    if (!editNo) return
    getLesson(editNo).then((l) => {
      if (!l || l.uid !== user.uid) {
        navigate(`/lesson/${editNo}`, { replace: true })
        return
      }
      const loaded = {
        ...EMPTY,
        ...l,
        mode: modeOf(l),
        anyAge: l.ageMin == null && l.ageMax == null,
        ageMin: l.ageMin ?? '',
        ageMax: l.ageMax ?? '',
      }
      setForm(loaded)
      setInitial(loaded)
    })
  }, [editNo, user.uid, navigate])

  // 새 레슨: 임시 저장된 글이 있으면 알려 줍니다
  useEffect(() => {
    if (editNo) return
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey(user.uid)))
      if (saved?.form) setDraft(saved)
    } catch {
      // 읽을 수 없으면 무시
    }
  }, [editNo, user.uid])

  const dirty = form && JSON.stringify(form) !== JSON.stringify(initial)

  // 새 레슨: 쓰는 중인 글을 임시 저장 (0.5초 동안 입력이 없으면)
  useEffect(() => {
    if (editNo || !form || draft) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        if (dirty) localStorage.setItem(draftKey(user.uid), JSON.stringify({ form, savedAt: Date.now() }))
        else localStorage.removeItem(draftKey(user.uid))
      } catch {
        // 저장 공간이 없으면 임시 저장만 건너뜁니다
      }
    }, 500)
    return () => clearTimeout(saveTimer.current)
  }, [form, dirty, draft, editNo, user.uid])

  // 고친 내용이 있는데 창을 닫거나 새로고침하면 한 번 묻습니다
  useEffect(() => {
    if (!dirty || saving) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

  // 한 번 등록을 눌렀으면, 고치는 즉시 오류를 다시 확인합니다
  useEffect(() => {
    if (submitted && form) setErrors(validate(form))
  }, [submitted, form])

  const preview = useMemo(
    () => form && { no: 0, authorName: profile.nickname, views: 0, createdAt: Date.now(), ...toFields(form) },
    [form, profile.nickname],
  )

  if (!form) return <p className="empty">불러오는 중…</p>

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const contentLength = form.content.trim().length
  const sameSubject = form.teach && form.learns.includes(form.teach)
  const contactWarning = looksLikeContact(form.content)
  const showPlace = form.mode !== 'online'

  function restoreDraft() {
    setForm({ ...EMPTY, ...draft.form })
    setDraft(null)
  }
  function discardDraft() {
    localStorage.removeItem(draftKey(user.uid))
    setDraft(null)
  }

  function insertTemplate() {
    if (form.content.trim() && !confirm('지금 쓴 소개를 예시로 바꿀까요?')) return
    set('content')(template(form))
  }

  function quickDays(group) {
    const allOn = group.every((d) => form.days.includes(d))
    set('days')(allOn ? form.days.filter((d) => !group.includes(d)) : [...new Set([...form.days, ...group])])
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    const found = validate(form)
    setErrors(found)
    const first = FIELD_ORDER.find((k) => found[k])
    if (first) {
      const el = document.getElementById(`field-${first}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const fields = toFields(form)
      const no = editNo ?? (await createLesson(user, profile, fields))
      if (editNo) await updateLesson(editNo, fields)
      if (!editNo) localStorage.removeItem(draftKey(user.uid))
      navigate(`/lesson/${no}`, { replace: true })
    } catch (err) {
      console.error(err)
      setSaveError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  return (
    <form className="form lesson-form" onSubmit={onSubmit} noValidate>
      <h1 className="page-title">{editNo ? `레슨 #${editNo} 수정` : '레슨 등록'}</h1>
      <p className="muted small"><span className="req">*</span> 표시는 꼭 적어야 해요.</p>

      {draft && (
        <div className="notice draft">
          <span>작성하던 글이 있어요. 이어서 쓸까요?</span>
          <span className="actions">
            <button type="button" onClick={discardDraft}>지우기</button>
            <button type="button" className="primary" onClick={restoreDraft}>불러오기</button>
          </span>
        </div>
      )}

      {/* ① 교환할 재능 */}
      <fieldset className="form-section">
        <legend><span className="step">1</span> 교환할 재능</legend>

        <div className="field">
          <span className="label" id="label-teach">가르쳐 줄 수 있어요 <span className="req">*</span></span>
          <CategoryPicker
            id="field-teach"
            value={form.teach ? [form.teach] : []}
            onChange={(v) => set('teach')(v[0] ?? 0)}
            invalid={Boolean(errors.teach)}
            describedBy="label-teach error-teach"
          />
          <FieldError id="error-teach" message={errors.teach} />
          <div className="sub-field">
            <span className="label small">이 과목 내 실력 (선택)</span>
            <ChipGroup label="가르칠 과목 실력" options={TEACH_LEVELS} value={form.teachLevel} onChange={set('teachLevel')} />
          </div>
        </div>

        <div className="field">
          <span className="label" id="label-learns">
            배우고 싶어요 <span className="req">*</span> <span className="muted small">최대 {MAX_LEARNS}개</span>
          </span>
          <CategoryPicker
            id="field-learns"
            value={form.learns}
            onChange={set('learns')}
            max={MAX_LEARNS}
            invalid={Boolean(errors.learns)}
            describedBy="label-learns error-learns"
          />
          <FieldError id="error-learns" message={errors.learns} />
          {sameSubject && (
            <p className="field-warn">가르칠 과목과 배울 과목이 같아요 (<strong>{categoryName(form.teach)}</strong>). 맞나요?</p>
          )}
          <div className="sub-field">
            <span className="label small">배울 과목 지금 내 수준 (선택)</span>
            <ChipGroup label="배울 과목 수준" options={LEARN_LEVELS} value={form.learnLevel} onChange={set('learnLevel')} />
          </div>
        </div>
      </fieldset>

      {/* ② 만나는 방법 */}
      <fieldset className="form-section">
        <legend><span className="step">2</span> 만나는 방법</legend>

        <div className="field">
          <span className="label">수업 방식</span>
          <ChipGroup label="수업 방식" options={MODES} value={form.mode} onChange={set('mode')} allowNone={false} />
        </div>

        <div className="row">
          {showPlace && (
            <label htmlFor="sido">
              <span className="label">지역</span>
              <select id="sido" value={form.sido} onChange={(e) => set('sido')(e.target.value)}>
                <option value="">선택 안 함</option>
                {SIDO.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          <label htmlFor="region" className="grow">
            <span className="label">{showPlace ? '만날 장소 (선택)' : '방법 (선택)'}</span>
            <input
              id="region"
              value={form.region}
              maxLength={REGION_MAX}
              placeholder={showPlace ? '예: 오리역 근처, 강남역' : '예: 줌 화상, 전화'}
              onChange={(e) => set('region')(e.target.value)}
            />
          </label>
        </div>

        <div className="field">
          <span className="label">가능한 요일 (선택)</span>
          <div className="chips">
            <button type="button" className={WEEKDAYS.every((d) => form.days.includes(d)) ? 'chip quick on' : 'chip quick'} onClick={() => quickDays(WEEKDAYS)}>평일</button>
            <button type="button" className={WEEKEND.every((d) => form.days.includes(d)) ? 'chip quick on' : 'chip quick'} onClick={() => quickDays(WEEKEND)}>주말</button>
            <span className="chip-sep" aria-hidden="true" />
            <ChipGroup label="요일" options={DAYS} value={form.days} onChange={set('days')} multiple />
          </div>
        </div>

        <div className="field">
          <span className="label">가능한 시간대 (선택)</span>
          <ChipGroup label="시간대" options={TIME_SLOTS} value={form.timeSlots} onChange={set('timeSlots')} multiple />
          {form.days.length === 0 && form.timeSlots.length === 0 && <p className="muted small hint">비워 두면 "시간 협의"로 보여요.</p>}
        </div>

        <div className="field" id="field-ages" tabIndex={-1}>
          <span className="label">희망 나이대</span>
          <label className="check">
            <input type="checkbox" checked={form.anyAge} onChange={(e) => set('anyAge')(e.target.checked)} />
            나이 무관
          </label>
          {!form.anyAge && (
            <div className="ages">
              <input type="number" inputMode="numeric" min="10" max="99" aria-label="최소 나이" placeholder="20" value={form.ageMin} onChange={(e) => set('ageMin')(e.target.value)} aria-invalid={Boolean(errors.ages)} />
              <span>~</span>
              <input type="number" inputMode="numeric" min="10" max="99" aria-label="최대 나이" placeholder="40" value={form.ageMax} onChange={(e) => set('ageMax')(e.target.value)} aria-invalid={Boolean(errors.ages)} />
              <span>세</span>
            </div>
          )}
          <FieldError message={errors.ages} />
        </div>
      </fieldset>

      {/* ③ 소개 */}
      <fieldset className="form-section">
        <legend><span className="step">3</span> 소개</legend>
        <div className="field">
          <div className="label-row">
            <label htmlFor="field-content" className="label">소개 글 <span className="req">*</span></label>
            <button type="button" className="link" onClick={insertTemplate}>예시 넣기</button>
          </div>
          <textarea
            id="field-content"
            rows={9}
            maxLength={CONTENT_MAX}
            value={form.content}
            aria-invalid={Boolean(errors.content)}
            aria-describedby="content-help error-content"
            placeholder="어떤 걸 얼마나 가르쳐 줄 수 있는지, 무엇을 배우고 싶은지, 어떻게 진행하면 좋을지 적어 주세요."
            onChange={(e) => set('content')(e.target.value)}
          />
          <p id="content-help" className="counter">
            <span className={contentLength < CONTENT_MIN ? 'under' : ''}>최소 {CONTENT_MIN}자</span> · {contentLength} / {CONTENT_MAX}
          </p>
          <FieldError id="error-content" message={errors.content} />
          <p className={contactWarning ? 'field-warn' : 'muted small'}>
            {contactWarning ? '⚠️ 연락처처럼 보이는 내용이 있어요. ' : '🔒 '}
            소개 글은 누구나 볼 수 있어요. 전화번호나 카톡 아이디는 신청을 수락한 뒤 답장으로 주고받으세요.
          </p>
        </div>

        {editNo && (
          <label className="check">
            <input type="checkbox" checked={form.closed} onChange={(e) => set('closed')(e.target.checked)} />
            모집 완료 (목록에는 남지만 새 신청을 받지 않아요)
          </label>
        )}
      </fieldset>

      <section className="form-section preview-section" aria-label="미리보기">
        <h2 className="legend-like">이렇게 보여요</h2>
        <LessonCard lesson={preview} now={Date.now()} preview />
      </section>

      <div className="form-actions">
        {saveError && <p className="error">{saveError}</p>}
        <div className="actions">
          <Link to={editNo ? `/lesson/${editNo}` : '/'} className="button">취소</Link>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? '저장 중…' : editNo ? '수정 완료' : '등록하기'}
          </button>
        </div>
      </div>
    </form>
  )
}
