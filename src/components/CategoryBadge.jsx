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

// 가르칠 과목 ⇄ 배울 과목. 예전 글은 한쪽이 비어 있을 수 있습니다.
// placeholder: 비어 있는 쪽에 점선 자리를 보여줄지 (등록 화면 미리보기용)
export function ExchangeBadges({ teach, learns = [], placeholder = false }) {
  const teachBadge = teach ? <CategoryBadge code={teach} kind="teach" /> : placeholder && <span className="cat cat-empty">가르칠 과목</span>
  const learnBadges = learns.length
    ? learns.map((c, i) => <CategoryBadge key={c} code={c} kind="learn" plain={i > 0} />)
    : placeholder && <span className="cat cat-empty">배울 과목</span>
  return (
    <span className="exchange">
      {teachBadge}
      {(placeholder || (teach && learns.length > 0)) && <span className="swap" aria-label="교환">⇄</span>}
      {learnBadges}
    </span>
  )
}
