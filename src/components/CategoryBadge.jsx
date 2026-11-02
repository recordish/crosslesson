import { categoryGroup, categoryName } from '../data/categories'

// kind: 'teach'(가르쳐요, 채움) | 'learn'(배울래요, 테두리)
export default function CategoryBadge({ code, kind }) {
  return (
    <span className={`cat cat-${kind} g-${categoryGroup(code)}`}>
      <span className="cat-kind">{kind === 'teach' ? '가르쳐요' : '배울래요'}</span>
      {categoryName(code)}
    </span>
  )
}

export function ExchangeBadges({ teach, learn }) {
  return (
    <span className="exchange">
      <CategoryBadge code={teach} kind="teach" />
      <span className="swap" aria-label="교환">⇄</span>
      <CategoryBadge code={learn} kind="learn" />
    </span>
  )
}
