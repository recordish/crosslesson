// 레슨 이전: data/lessons.json → lessons/{no}, counters/lessons
//
// data/lessons.json 형식 (MySQL 레슨 테이블에서 만들어 둡니다)
//   [{ "no": 5858, "legacyUserId": 123, "authorName": "글로리",
//      "teach": 204, "learn": 306,            ← 배울 과목 하나 (또는 "learns": [306, 402])
//      "region": "오리역", "sido": "",         ← sido 가 비어 있으면 region 에서 시/도 이름을 찾아 봅니다
//      "days": "Tuesday, Wednesday",           ← 예전 요일 항목 (선택. 영문·한글 요일, 쉼표 구분 또는 배열)
//      "mode": "",                             ← 'online' | 'offline' | 'both' (선택. 없으면 장소 글로 짐작)
//      "ageMin": 20, "ageMax": 45, "content": "...", "views": 2426,
//      "createdAt": "2025-04-16 10:00:00", "closed": false }, ...]
//
// 새 사이트에만 있는 항목은 이렇게 채웁니다.
//   learns     ← learn 하나를 목록으로 ([306])
//   online/offline ← mode 가 있으면 그대로, 없으면 장소에 "온라인·화상·줌" 등이 있으면 온라인,
//                    소개 글에만 있으면 둘 다, 아니면 만나서
//   days       ← 예전 요일 항목, timeSlots ← 예전 시간 코드 (convert-lessons.mjs 가 오전/오후/저녁으로 바꿔 둠)
//   teachLevel, learnLevel ← '' (선택 안 함)
//
// - 레슨 번호(no)를 그대로 써서 예전 주소 lesson.php?no=5858 → /lesson/5858 이 이어집니다.
// - 작성자 uid 는 "legacy-{legacyUserId}" (import-users.mjs 와 같은 규칙)
// - 보안 규칙과 같은 기준으로 값을 다듬습니다. 규칙을 벗어난 값이 있으면 작성자가 나중에 글을 수정할 수 없기 때문입니다.
// - 끝나면 counters/lessons.last 를 가장 큰 번호로 맞춰서, 새 레슨이 그 다음 번호부터 붙습니다.
//
// 실행: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-lessons.mjs [--dry-run]
import { isCategory, SIDO } from '../../src/data/categories.js'
import { DAYS, MAX_LEARNS, ordered, TIME_SLOTS } from '../../src/data/lessonOptions.js'
import { db, DRY_RUN, readJson, toMillis } from './admin.mjs'

const lessons = readJson('data/lessons.json')
const warnings = []
const warn = (no, msg) => warnings.push(`#${no}: ${msg}`)

const chars = (s) => [...String(s ?? '').trim()]
function age(v, no) {
  if (v == null || v === '' || v === 0) return null
  const n = Number(v)
  if (Number.isInteger(n) && n >= 10 && n <= 99) return n
  warn(no, `나이 ${v} → 무관으로`)
  return null
}

const ONLINE_WORDS = /온라인|화상|비대면|줌|zoom|스카이프|skype|구글\s*미트|meet|전화|카톡\s*통화|디스코드/i
const DAY_NAMES = {
  mon: ['mon', 'monday', '월'], tue: ['tue', 'tuesday', '화'], wed: ['wed', 'wednesday', '수'], thu: ['thu', 'thursday', '목'],
  fri: ['fri', 'friday', '금'], sat: ['sat', 'saturday', '토'], sun: ['sun', 'sunday', '일'],
}
function parseDays(v, no) {
  if (v == null || v === '') return []
  const parts = (Array.isArray(v) ? v : String(v).split(/[,\s/·]+/)).map((x) => String(x).trim().toLowerCase().replace(/요일$/, '')).filter(Boolean)
  const days = []
  for (const p of parts) {
    const code = Object.keys(DAY_NAMES).find((k) => DAY_NAMES[k].includes(p))
    if (code) days.push(code)
    else if (p === '평일') days.push('mon', 'tue', 'wed', 'thu', 'fri')
    else if (p === '주말') days.push('sat', 'sun')
    else warn(no, `요일 "${p}" 를 알 수 없어 뺌`)
  }
  return ordered(DAYS, [...new Set(days)])
}
function parseMode(l, no) {
  if (l.mode === 'online') return { online: true, offline: false }
  if (l.mode === 'both') return { online: true, offline: true }
  if (l.mode === 'offline') return { online: false, offline: true }
  if (ONLINE_WORDS.test(String(l.region ?? '')) || l.sido === '온라인') {
    warn(no, `장소 "${l.region ?? l.sido}" → 온라인 레슨으로`)
    return { online: true, offline: false }
  }
  if (ONLINE_WORDS.test(String(l.content ?? ''))) {
    warn(no, '소개 글에 온라인 관련 말이 있어 → 온라인 · 만나서 둘 다로')
    return { online: true, offline: true }
  }
  return { online: false, offline: true }
}
function guessSido(l) {
  if (SIDO.includes(l.sido)) return l.sido
  const text = `${l.sido ?? ''} ${l.region ?? ''}`
  return SIDO.find((s) => text.includes(s)) ?? ''
}

function normalize(l) {
  const no = Number(l.no)
  if (!Number.isInteger(no) || no < 1) throw new Error(`잘못된 번호: ${l.no}`)
  const teach = Number(l.teach)
  const validCode = (c) => Number.isInteger(c) && c >= 100 && c <= 999
  if (!validCode(teach)) throw new Error(`#${no} 가르칠 과목 코드가 잘못됨: ${l.teach}`)
  const rawLearns = (Array.isArray(l.learns) ? l.learns : [l.learn]).map(Number)
  const learns = [...new Set(rawLearns.filter(validCode))].slice(0, MAX_LEARNS)
  if (learns.length === 0) throw new Error(`#${no} 배울 과목 코드가 잘못됨: ${JSON.stringify(l.learns ?? l.learn)}`)
  for (const c of [teach, ...learns]) {
    if (!isCategory(c)) warn(no, `과목 코드 ${c} 가 src/data/categories.js 에 없음 ("분류 ${c}"로 보임)`)
  }
  let content = chars(l.content)
  if (content.length > 3000) {
    warn(no, `소개 ${content.length}자 → 3000자로 자름`)
    content = content.slice(0, 3000)
  }
  if (content.length < 10) {
    warn(no, '소개가 10자 미만 → 안내 문구 덧붙임')
    content = chars(`${content.join('')} (예전 크로스레슨에서 옮겨 온 글)`)
  }
  let ageMin = age(l.ageMin, no)
  let ageMax = age(l.ageMax, no)
  if (ageMin != null && ageMax != null && ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin]
  const { online, offline } = parseMode(l, no)
  const sido = offline ? guessSido(l) : ''
  // 회원번호가 없는 글(비회원 글)은 글마다 따로 주인을 둡니다 (아무도 수정할 수 없음)
  const uid = l.legacyUserId ? `legacy-${l.legacyUserId}` : `legacy-guest-${no}`
  let authorName = chars(l.authorName).slice(0, 12).join('')
  if (authorName.length < 2) authorName = l.legacyUserId ? `회원${l.legacyUserId}` : '예전 회원'
  const createdAt = toMillis(l.createdAt)
  return {
    no,
    uid,
    authorName,
    teach,
    learns,
    teachLevel: '',
    learnLevel: '',
    online,
    offline,
    sido,
    region: chars(l.region).slice(0, 40).join(''),
    days: parseDays(l.days, no),
    timeSlots: ordered(TIME_SLOTS, Array.isArray(l.timeSlots) ? l.timeSlots : []),
    ageMin,
    ageMax,
    content: content.join(''),
    closed: Boolean(l.closed),
    views: Math.max(0, Number(l.views) || 0),
    createdAt,
    updatedAt: l.updatedAt ? toMillis(l.updatedAt) : createdAt,
  }
}

const docs = []
let errors = 0
for (const l of lessons) {
  try {
    docs.push(normalize(l))
  } catch (e) {
    errors++
    console.error('  ✗', e.message)
  }
}
const maxNo = docs.reduce((m, d) => Math.max(m, d.no), 0)
console.log(`레슨 ${docs.length}개 준비 (건너뜀 ${errors}개), 가장 큰 번호 #${maxNo}${DRY_RUN ? ' (시험 실행: 저장 안 함)' : ''}`)
warnings.forEach((w) => console.warn('  ⚠️', w))

if (!DRY_RUN) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch()
    docs.slice(i, i + 400).forEach((d) => batch.set(db.doc(`lessons/${d.no}`), d))
    await batch.commit()
    console.log(`  ${Math.min(i + 400, docs.length)} / ${docs.length}`)
  }
  // 카운터는 줄어들지 않게만 맞춥니다 (이전 도중에 새 레슨이 올라왔을 수도 있으니)
  await db.runTransaction(async (tx) => {
    const ref = db.doc('counters/lessons')
    const snap = await tx.get(ref)
    const last = snap.exists ? snap.data().last : 0
    if (maxNo > last) tx.set(ref, { last: maxNo })
  })
  console.log('완료')
}
