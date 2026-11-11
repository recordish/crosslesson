// 레슨 등록 항목의 선택지. 값(영문 코드)은 firestore.rules 와 scripts/migrate 에서도 같은 값을 씁니다.

export const MAX_LEARNS = 3 // 배우고 싶은 과목은 3개까지

// 수업 방식 → 저장할 때는 online, offline 두 칸(참/거짓)으로 나눕니다 ("둘 다"는 둘 다 참)
export const MODES = [
  ['offline', '만나서'],
  ['online', '온라인'],
  ['both', '둘 다 좋아요'],
]
export const modeOf = (l) => (l.online && l.offline ? 'both' : l.online ? 'online' : 'offline')
export const modeFlags = (mode) => ({ online: mode !== 'offline', offline: mode !== 'online' })
export const modeLabel = (l) => ({ both: '온라인 · 만나서', online: '온라인', offline: '만나서' })[modeOf(l)]

// 가능한 요일 (예전 사이트의 요일 항목과 같은 단위)
export const DAYS = [
  ['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'], ['fri', '금'], ['sat', '토'], ['sun', '일'],
]
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
export const WEEKEND = ['sat', 'sun']
export const TIME_SLOTS = [
  ['morning', '오전'],
  ['afternoon', '오후'],
  ['evening', '저녁'],
]

// 가르칠 과목의 내 실력 / 배울 과목의 지금 내 수준 ('' = 선택 안 함)
export const TEACH_LEVELS = [
  ['hobby', '취미 수준'],
  ['skilled', '능숙해요'],
  ['pro', '전공 · 전문가'],
]
export const LEARN_LEVELS = [
  ['beginner', '완전 처음'],
  ['basic', '기초는 있어요'],
  ['intermediate', '중급 이상'],
]
export const levelLabel = (list, value) => list.find(([v]) => v === value)?.[1] ?? ''

// 목록의 정해진 순서대로 정리합니다 (중복 제거).
export const ordered = (list, values) => list.map(([v]) => v).filter((v) => values.includes(v))

const has = (values, group) => group.every((d) => values.includes(d))

// 요일을 순서대로 읽기 쉽게: ['fri','sat','sun'] → '금 · 주말', ['mon'..'fri','sat'] → '평일 · 토'
export function daysLabel(days) {
  const d = ordered(DAYS, days)
  if (d.length === 0) return ''
  if (d.length === 7) return '매일'
  const name = (x) => DAYS.find(([v]) => v === x)[1]
  const part = (group, label) => (has(d, group) ? [label] : d.filter((x) => group.includes(x)).map(name))
  return [...part(WEEKDAYS, '평일'), ...part(WEEKEND, '주말')].join(' · ')
}

// 요일 + 시간대 → '평일 · 토 저녁' / '오전 · 오후' / '시간 협의'
export function scheduleLabel(days = [], slots = []) {
  const s = ordered(TIME_SLOTS, slots).map((x) => TIME_SLOTS.find(([v]) => v === x)[1]).join(' · ')
  return [daysLabel(days), s].filter(Boolean).join(' ') || '시간 협의'
}

// 희망 나이대 (여러 개, 꼭 하나 이상). 예전 글은 ageMin/ageMax(숫자 범위)로 저장돼 있습니다.
export const AGE_GROUPS = [
  ['20s', '20대'],
  ['30s', '30대'],
  ['40s', '40대'],
  ['50s', '50대'],
]
export function ageGroupsLabel(lesson) {
  const groups = AGE_GROUPS.filter(([v]) => (lesson.ageGroups ?? []).includes(v)).map(([, t]) => t)
  if (groups.length) return groups.join(' · ')
  const { ageMin: min, ageMax: max } = lesson
  if (min == null && max == null) return '나이 무관'
  if (min == null) return `~${max}세`
  if (max == null) return `${min}세~`
  return `${min}-${max}세`
}
