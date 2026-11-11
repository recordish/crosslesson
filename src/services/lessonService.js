// 레슨 데이터 접근 계층
// Firestore
//   lessons/{no}        { no, uid, authorName,
//                         teach, learns[1~3], teachLevel, learnLevel,       ← 교환할 과목과 수준
//                         online, offline, sido, region,                     ← 수업 방식과 장소
//                         days[], timeSlots[], ageGroups[], ageMin, ageMax,  ← 가능한 시간, 나이대(ageMin/Max 는 예전 글)
//                         content, closed, views, createdAt, updatedAt }
//   counters/lessons    { last }  ← 마지막 레슨 번호. 새 레슨은 last + 1 번 (예전 번호를 이어감)
// 로컬 모드: localDb (같은 모양)
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore/lite'
import { db } from '../firebase/config'
import { AGE_GROUPS, DAYS, LEARN_LEVELS, MAX_LEARNS, ordered, TEACH_LEVELS, TIME_SLOTS } from '../data/lessonOptions'
import { delay, readDb, writeDb } from './localDb'

export const PAGE_SIZE = 20
export const CONTENT_MIN = 10
export const CONTENT_MAX = 3000
export const REGION_MAX = 40

// 저장된 레슨을 화면에서 쓰는 모양으로 맞춥니다.
// 예전 모양(learn 하나, online/offline·요일 없음)으로 저장된 글도 깨지지 않게 기본값을 채웁니다.
export function normalizeLesson(l) {
  if (!l) return l
  const learns = Array.isArray(l.learns) ? l.learns : l.learn ? [l.learn] : []
  const hasMode = typeof l.online === 'boolean' || typeof l.offline === 'boolean'
  return {
    teachLevel: '',
    learnLevel: '',
    region: '',
    sido: '',
    ageMin: null,
    ageMax: null,
    closed: false,
    views: 0,
    content: '',
    ...l,
    teach: l.teach || null,
    learns,
    online: hasMode ? Boolean(l.online) : false,
    offline: hasMode ? Boolean(l.offline) : true,
    days: Array.isArray(l.days) ? l.days : [],
    timeSlots: Array.isArray(l.timeSlots) ? l.timeSlots : [],
    ageGroups: Array.isArray(l.ageGroups) ? l.ageGroups : [],
  }
}

const lessonsCol = () => collection(db, 'lessons')
const lessonRef = (no) => doc(db, 'lessons', String(no))
const counterRef = () => doc(db, 'counters', 'lessons')
const byNewest = (a, b) => b.no - a.no

const known = (list, v) => (list.some(([x]) => x === v) ? v : '')

// 사용자가 고칠 수 있는 필드만 골라 정리합니다. (firestore.rules 의 editable() 과 같은 모양)
// 장소는 만나서 하는 레슨일 때만 시/도를 남깁니다.
export function pickFields(f) {
  const offline = Boolean(f.offline)
  return {
    teach: f.teach,
    learns: [...new Set(f.learns)].slice(0, MAX_LEARNS),
    teachLevel: known(TEACH_LEVELS, f.teachLevel),
    learnLevel: known(LEARN_LEVELS, f.learnLevel),
    online: Boolean(f.online),
    offline,
    sido: offline ? f.sido : '',
    region: f.region.trim(),
    days: ordered(DAYS, f.days),
    timeSlots: ordered(TIME_SLOTS, f.timeSlots),
    ageGroups: ordered(AGE_GROUPS, f.ageGroups ?? []),
    ageMin: f.ageMin ?? null,
    ageMax: f.ageMax ?? null,
    content: f.content.trim(),
    closed: Boolean(f.closed),
  }
}

const matches = (l, f) =>
  (!f.teach || l.teach === f.teach) &&
  (!f.learn || l.learns.includes(f.learn)) &&
  (!f.sido || l.sido === f.sido) &&
  (!f.mode || l[f.mode] === true)

// 레슨 목록을 최신 번호순으로 PAGE_SIZE 개씩 가져옵니다.
// filters: { teach, learn, sido, mode } (없으면 전체)
//   teach: 이 과목을 가르쳐 주는 레슨 (= 내가 배울 수 있음)
//   learn: 이 과목을 배우고 싶어 하는 레슨 (= 내가 가르쳐 줄 수 있음)
//   mode:  'online' | 'offline'  ("둘 다" 레슨은 양쪽에 모두 나옵니다)
// 필터 조합마다 복합 색인이 필요합니다 → firestore.indexes.json (scripts/gen-indexes.mjs 로 생성)
// 반환: { lessons, next }  next 가 null 이면 마지막 페이지
export async function listLessons(filters = {}, cursor = null) {
  if (db) {
    const parts = []
    if (filters.teach) parts.push(where('teach', '==', filters.teach))
    if (filters.learn) parts.push(where('learns', 'array-contains', filters.learn))
    if (filters.sido) parts.push(where('sido', '==', filters.sido))
    if (filters.mode) parts.push(where(filters.mode, '==', true))
    parts.push(orderBy('no', 'desc'))
    if (cursor) parts.push(startAfter(cursor))
    parts.push(limit(PAGE_SIZE + 1))
    const snap = await getDocs(query(lessonsCol(), ...parts))
    const docs = snap.docs.slice(0, PAGE_SIZE)
    return {
      lessons: docs.map((d) => normalizeLesson(d.data())),
      next: snap.docs.length > PAGE_SIZE ? docs[docs.length - 1] : null,
    }
  }
  const all = Object.values(readDb().lessons).map(normalizeLesson).filter((l) => matches(l, filters)).sort(byNewest)
  const start = cursor ?? 0
  return delay({
    lessons: all.slice(start, start + PAGE_SIZE),
    next: all.length > start + PAGE_SIZE ? start + PAGE_SIZE : null,
  })
}

export async function getLesson(no) {
  if (db) {
    const snap = await getDoc(lessonRef(no))
    return snap.exists() ? normalizeLesson(snap.data()) : null
  }
  return delay(normalizeLesson(readDb().lessons[no] ?? null))
}

export async function getLessonsByUser(uid) {
  if (db) {
    const snap = await getDocs(query(lessonsCol(), where('uid', '==', uid)))
    return snap.docs.map((d) => normalizeLesson(d.data())).sort(byNewest)
  }
  return delay(Object.values(readDb().lessons).filter((l) => l.uid === uid).map(normalizeLesson).sort(byNewest))
}

// 새 레슨을 만들고 번호를 돌려줍니다. 번호는 counters/lessons 를 1 늘려서 정합니다.
export async function createLesson(user, profile, fields) {
  const now = Date.now()
  const base = { uid: user.uid, authorName: profile.nickname, views: 0, createdAt: now, updatedAt: now }
  if (db) {
    return runTransaction(db, async (tx) => {
      const counter = await tx.get(counterRef())
      const no = (counter.exists() ? counter.data().last : 0) + 1
      tx.set(lessonRef(no), { no, ...base, ...pickFields(fields) })
      tx.set(counterRef(), { last: no })
      return no
    })
  }
  return delay(
    writeDb((d) => {
      const no = d.counter + 1
      d.counter = no
      d.lessons[no] = { no, ...base, ...pickFields(fields) }
      return no
    }),
  )
}

export async function updateLesson(no, fields) {
  const patch = { ...pickFields(fields), updatedAt: Date.now() }
  if (db) {
    await updateDoc(lessonRef(no), patch)
    return
  }
  writeDb((d) => {
    d.lessons[no] = { ...d.lessons[no], ...patch }
  })
}

export async function setLessonClosed(no, closed) {
  const patch = { closed, updatedAt: Date.now() }
  if (db) {
    await updateDoc(lessonRef(no), patch)
    return
  }
  writeDb((d) => {
    d.lessons[no] = { ...d.lessons[no], ...patch }
  })
}

export async function deleteLesson(no) {
  if (db) {
    await deleteDoc(lessonRef(no))
    return
  }
  writeDb((d) => {
    delete d.lessons[no]
  })
}

// 조회수 +1. 같은 브라우저 탭에서는 레슨마다 한 번만 셉니다. 실패해도 화면에는 영향 없음.
export async function countView(no) {
  const key = `crosslesson:viewed:${no}`
  try {
    if (sessionStorage.getItem(key)) return false
    sessionStorage.setItem(key, '1')
  } catch {
    return false
  }
  try {
    if (db) await updateDoc(lessonRef(no), { views: increment(1) })
    else writeDb((d) => d.lessons[no] && (d.lessons[no].views += 1))
    return true
  } catch (e) {
    console.warn('조회수 기록 실패:', e)
    return false
  }
}

// 닉네임을 바꾸면 내 레슨에 적힌 작성자 이름도 바꿉니다.
export async function syncAuthorName(uid, nickname) {
  if (db) {
    const mine = await getLessonsByUser(uid)
    await Promise.all(mine.map((l) => updateDoc(lessonRef(l.no), { authorName: nickname })))
    return
  }
  writeDb((d) => {
    Object.values(d.lessons).forEach((l) => l.uid === uid && (l.authorName = nickname))
  })
}
