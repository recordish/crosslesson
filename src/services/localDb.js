// 로컬 모드 저장소 (Firebase 설정 전 개발·시연용)
// 브라우저 localStorage 에 Firestore 와 같은 모양의 데이터를 저장합니다.
//   { users: {uid: profile}, lessons: {no: lesson}, applications: {id: app}, counter: number }
const KEY = 'crosslesson:db'
const DAY = 24 * 60 * 60 * 1000

function seed() {
  const now = Date.now()
  const lesson = (no, uid, authorName, f, daysAgo) => ({
    no, uid, authorName, ageMin: null, ageMax: null, closed: false, views: 0,
    createdAt: now - daysAgo * DAY, updatedAt: now - daysAgo * DAY, ...f,
  })
  return {
    users: {
      'sample-1': { nickname: '바이올린하는사람', intro: '음대에서 바이올린을 전공했어요.' },
      'sample-2': { nickname: '코딩하는영어쌤', intro: '' },
      'sample-3': { nickname: '물개', intro: '수영 강습 경력 5년' },
    },
    lessons: {
      1: lesson(1, 'sample-3', '물개', {
        teach: 601, learn: 101, sido: '서울', region: '사당역', ageMin: 20, ageMax: 35,
        content: '자유형, 배영부터 접영까지 알려드릴 수 있어요.\n대신 영어 회화를 배우고 싶습니다. 주말 오전 가능해요.',
      }, 9),
      2: lesson(2, 'sample-2', '코딩하는영어쌤', {
        teach: 101, learn: 402, sido: '온라인', region: '화상',
        content: '해외 근무 경험으로 비즈니스 영어를 알려드려요.\n파이썬이나 자바스크립트를 처음부터 배우고 싶어요.',
      }, 4),
      3: lesson(3, 'sample-1', '바이올린하는사람', {
        teach: 204, learn: 306, sido: '경기', region: '오리역 근처', ageMin: 20, ageMax: 45,
        content: '취미, 입시, 기초 모두 차근차근 알려드릴 수 있어요.\n유튜브 영상 편집(프리미어, 캡컷)을 배우고 싶습니다!',
      }, 1),
    },
    applications: {},
    counter: 3,
  }
}

export function readDb() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY))
    if (data) return data
  } catch {
    // 손상된 값이면 새로 시작합니다.
  }
  return seed()
}

// fn(data) 로 데이터를 고친 뒤 저장하고, fn 의 반환값을 돌려줍니다.
export function writeDb(fn) {
  const data = readDb()
  const result = fn(data)
  localStorage.setItem(KEY, JSON.stringify(data))
  return result
}

// 실제 서버처럼 잠깐 기다렸다가 돌려줍니다 (로딩 화면 확인용).
export const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 80))
