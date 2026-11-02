import { GROUPS } from '../data/categories'

// 과목 선택 상자. value 는 숫자 코드 (없으면 0)
export default function CategorySelect({ id, value, onChange, emptyLabel, required = false }) {
  return (
    <select
      id={id}
      value={value || ''}
      required={required}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    >
      <option value="">{emptyLabel}</option>
      {GROUPS.map((g) => (
        <optgroup key={g.id} label={g.name}>
          {g.items.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
