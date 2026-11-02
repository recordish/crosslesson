import { useState } from 'react'
import { categoryGroup, categoryName, GROUPS } from '../data/categories'

const groupName = (code) => GROUPS.find((g) => g.id === categoryGroup(code))?.name ?? ''

// 과목 고르기: 분야 버튼 → 과목 버튼.
// 고르고 나면 목록을 접고 "음악 › 피아노 [바꾸기]" 한 줄(여러 개면 고른 과목 버튼 + 추가)만 보여줍니다.
// value: 고른 과목 코드 목록. max 가 1 이면 하나만 고릅니다.
export default function CategoryPicker({ id, value, onChange, max = 1, invalid = false, describedBy }) {
  const [open, setOpen] = useState(value.length === 0)
  const [group, setGroup] = useState(() => (value[0] ? categoryGroup(value[0]) : null))
  const items = GROUPS.find((g) => g.id === group)?.items ?? []
  const multi = max > 1
  const full = multi && value.length >= max

  function pick(code) {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code))
      return
    }
    if (!multi) onChange([code])
    else if (!full) onChange([...value, code])
    else return
    setOpen(false) // 고르면 접기
  }

  function remove(code) {
    const next = value.filter((c) => c !== code)
    onChange(next)
    if (next.length === 0) setOpen(true)
  }

  const className = `picker${invalid ? ' invalid' : ''}`

  // 접힌 모습
  if (!open && value.length > 0) {
    return (
      <div id={id} tabIndex={-1} className={className} aria-describedby={describedBy}>
        {multi ? (
          <div className="picked">
            {value.map((c) => (
              <button key={c} type="button" className={`chip on g-${categoryGroup(c)}`} onClick={() => remove(c)} aria-label={`${categoryName(c)} 빼기`}>
                {categoryName(c)} <span aria-hidden="true">×</span>
              </button>
            ))}
            {!full && (
              <button type="button" className="chip add" onClick={() => setOpen(true)}>＋ 과목 추가</button>
            )}
          </div>
        ) : (
          <div className="picked-summary">
            <span className="path">
              <span className="muted">{groupName(value[0])} ›</span> <strong>{categoryName(value[0])}</strong>
            </span>
            <button type="button" className="link" onClick={() => setOpen(true)}>바꾸기</button>
          </div>
        )}
      </div>
    )
  }

  // 펼친 모습
  return (
    <div id={id} tabIndex={-1} className={className} aria-describedby={describedBy}>
      {multi && value.length > 0 && (
        <div className="picked">
          {value.map((c) => (
            <button key={c} type="button" className={`chip on g-${categoryGroup(c)}`} onClick={() => remove(c)} aria-label={`${categoryName(c)} 빼기`}>
              {categoryName(c)} <span aria-hidden="true">×</span>
            </button>
          ))}
          <span className="muted small">{value.length} / {max}개</span>
        </div>
      )}
      <div>
        <span className="mini-label">분야</span>
        <div className="chips groups" role="group" aria-label="분야">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`chip group g-${g.id}${group === g.id ? ' on' : ''}`}
              aria-pressed={group === g.id}
              onClick={() => setGroup(g.id)}
            >
              {g.name}
              {value.some((c) => categoryGroup(c) === g.id) && <span className="dot" aria-label="고름" />}
            </button>
          ))}
        </div>
      </div>
      {group && (
        <div className="items-box">
          <span className="mini-label">과목</span>
          <div className="chips items" role="group" aria-label="과목">
            {items.map(([code, name]) => {
              const on = value.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  className={`chip item g-${group}${on ? ' on' : ''}`}
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => pick(code)}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {value.length > 0 && (
        <div className="picker-foot">
          <button type="button" className="link" onClick={() => setOpen(false)}>접기</button>
        </div>
      )}
    </div>
  )
}
