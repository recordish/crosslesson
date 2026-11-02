// "방금 전", "3분 전", "2시간 전", "5일 전", 그보다 오래되면 날짜로 보여줍니다.
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function relativeTime(ts, now = Date.now()) {
  const diff = now - ts
  if (diff < MIN) return '방금 전'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}분 전`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`
  const d = new Date(ts)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return sameYear
    ? `${d.getMonth() + 1}월 ${d.getDate()}일`
    : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

// 마우스를 올리면 보여줄 전체 날짜/시각
export const fullDateTime = (ts) =>
  new Date(ts).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })
