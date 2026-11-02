import { categoryGroup, categoryName } from '../data/categories'

// kind: 'teach'(가르쳐요, 채움) | 'learn'(배울래요, 테두리)
// plain: 앞의 "가르쳐요/배울래요" 글자 없이 과목 이름만 (두 번째 이후 배울 과목)
export default function CategoryBadge({ code, kind, plain = false }) {
  return (
    <span className={`cat cat-${kind} g-${categoryGroup(code)}`}>
      {!plain && <span className="cat-kind">{kind === 'teach' ? '가르쳐요' : '배울래요'}</span>}
      {categoryName(code)}
    </span>
  )
}

export function ExchangeBadges({ teach, learns }) {
  return (
    <span className="exchange">
      {teach ? <CategoryBadge code={teach} kind="teach" /> : <span className="cat cat-empty">가르칠 과목</span>}
      <span className="swap" aria-label="교환">⇄</span>
      {learns?.length ? (
        learns.map((c, i) => <CategoryBadge key={c} code={c} kind="learn" plain={i > 0} />)
      ) : (
        <span className="cat cat-empty">배울 과목</span>
      )}
    </span>
  )
}
