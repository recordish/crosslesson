// 여러 개 또는 하나를 고르는 작은 버튼 묶음
// options: [[value, label], ...]  value: 배열(multiple) 또는 문자열(single)
export default function ChipGroup({ options, value, onChange, multiple = false, label, allowNone = true }) {
  const isOn = (v) => (multiple ? value.includes(v) : value === v)

  function toggle(v) {
    if (multiple) onChange(isOn(v) ? value.filter((x) => x !== v) : [...value, v])
    else onChange(isOn(v) && allowNone ? '' : v)
  }

  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={isOn(v) ? 'chip on' : 'chip'} aria-pressed={isOn(v)} onClick={() => toggle(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}
