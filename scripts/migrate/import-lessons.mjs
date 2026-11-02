// 레슨 이전: data/lessons.json → lessons/{no}, counters/lessons
//
// data/lessons.json 형식 (MySQL 레슨 테이블에서 만들어 둡니다)
//   [{ "no": 5858, "legacyUserId": 123, "authorName": "글로리",
//      "teach": 204, "learn": 306, "region": "오리역", "sido": "",
//      "ageMin": 20, "ageMax": 45, "content": "...", "views": 2426,
//      "createdAt": "2025-04-16 10:00:00", "closed": false }, ...]
//
// - 레슨 번호(no)를 그대로 써서 예전 주소 lesson.php?no=5858 → /lesson/5858 이 이어집니다.
// - 작성자 uid 는 "legacy-{legacyUserId}" (import-users.mjs 와 같은 규칙)
// - 보안 규칙과 같은 기준으로 값을 다듬습니다. 규칙을 벗어난 값이 있으면 작성자가 나중에 글을 수정할 수 없기 때문입니다.
// - 끝나면 counters/lessons.last 를 가장 큰 번호로 맞춰서, 새 레슨이 그 다음 번호부터 붙습니다.
//
// 실행: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-lessons.mjs [--dry-run]
import { isCategory, SIDO } from '../../src/data/categories.js'
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

function normalize(l) {
  const no = Number(l.no)
  if (!Number.isInteger(no) || no < 1) throw new Error(`잘못된 번호: ${l.no}`)
  const teach = Number(l.teach)
  const learn = Number(l.learn)
  for (const [label, c] of [['가르칠 과목', teach], ['배울 과목', learn]]) {
    if (!(Number.isInteger(c) && c >= 100 && c <= 999)) throw new Error(`#${no} ${label} 코드가 잘못됨: ${c}`)
    if (!isCategory(c)) warn(no, `${label} 코드 ${c} 가 src/data/categories.js 에 없음 ("분류 ${c}"로 보임)`)
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
  const sido = SIDO.includes(l.sido) ? l.sido : ''
  let authorName = chars(l.authorName).slice(0, 12).join('')
  if (authorName.length < 2) authorName = `회원${l.legacyUserId}`
  const createdAt = toMillis(l.createdAt)
  return {
    no,
    uid: `legacy-${l.legacyUserId}`,
    authorName,
    teach,
    learn,
    sido,
    region: chars(l.region).slice(0, 40).join(''),
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
