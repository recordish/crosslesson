import { useState } from 'react'
import { categoryGroup, categoryName, GROUPS } from '../data/categories'

// 과목 고르기: 대분류 버튼 → 과목 버튼 (긴 선택 목록 대신)
// value: 고른 과목 코드 목록. max 가 1 이면 하나만 고릅니다(다시 고르면 바뀜).
export default function CategoryPicker({ id, value, onChange, max = 1, invalid = false, describedBy }) {
  const [group, setGroup] = useState(() => (value[0] ? categoryGroup(value[0]) : null))
  const items = GROUPS.find((g) => g.id === group)?.items ?? []
  const full = max > 1 && value.length >= max

  function toggle(code) {
    if (value.includes(code)) onChange(value.filter((c) => c !== code))
    else if (max === 1) onChange([code])
    else if (!full) onChange([...value, code])
  }

  return (
    <div id={id} tabIndex={-1} className={invalid ? 'picker invalid' : 'picker'} aria-describedby={describedBy}>
      {max > 1 && value.length > 0 && (
        <div className="picked">
          {value.map((c) => (
            <button key={c} type="button" className={`chip on g-${categoryGroup(c)}`} onClick={() => toggle(c)} aria-label={`${categoryName(c)} 빼기`}>
              {categoryName(c)} <span aria-hidden="true">×</span>
            </button>
          ))}
          <span className="muted small">{value.length} / {max}개</span>
        </div>
      )}
      <div className="chips groups" role="group" aria-label="분야">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`chip group g-${g.id}${group === g.id ? ' on' : ''}`}
            aria-pressed={group === g.id}
            onClick={() => setGroup(group === g.id ? null : g.id)}
          >
            {g.name}
            {value.some((c) => categoryGroup(c) === g.id) && <span className="dot" aria-label="고름" />}
          </button>
        ))}
      </div>
      {group && (
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
                onClick={() => toggle(code)}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}
      {!group && value.length === 0 && <p className="muted small hint">분야를 먼저 골라 주세요.</p>}
      {max === 1 && value[0] && !group && <p className="small hint">고른 과목: <strong>{categoryName(value[0])}</strong></p>}
    </div>
  )
}
