// firestore.rules 테스트. 실행: cd tests/rules && npm install && npm test
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, increment, runTransaction, collection, query, where, getDocs } from 'firebase/firestore'

const env = await initializeTestEnvironment({
  projectId: 'demo-crosslesson',
  firestore: { rules: readFileSync(process.argv[2], 'utf8'), host: '127.0.0.1', port: 8080 },
})
const A = env.authenticatedContext('userA').firestore()
const B = env.authenticatedContext('userB').firestore()
const anon = env.unauthenticatedContext().firestore()
let pass = 0, fail = 0
async function t(name, p) {
  try { await p; pass++; console.log('ok  ', name) } catch (e) { fail++; console.log('FAIL', name, e.message?.slice(0, 120)) }
}
const now = Date.now()
const lessonData = (no, uid, extra = {}) => ({ no, uid, authorName: '에이유저', teach: 204, learns: [306], teachLevel: 'pro', learnLevel: '',
  online: false, offline: true, sido: '경기', region: '오리역', days: ['sat', 'sun'], timeSlots: ['evening'],
  ageGroups: ['20s', '30s'], ageMin: null, ageMax: null, content: '바이올린 가르쳐 드려요, 영상편집 배우고 싶어요', closed: false, views: 0, createdAt: now, updatedAt: now, ...extra })

async function createLesson(db, uid, override = {}) {
  return runTransaction(db, async (tx) => {
    const c = await tx.get(doc(db, 'counters', 'lessons'))
    const no = (c.exists() ? c.data().last : 0) + 1
    tx.set(doc(db, 'lessons', String(no)), lessonData(no, uid, override))
    tx.set(doc(db, 'counters', 'lessons'), { last: no })
    return no
  })
}

// profiles
await t('profile: own create', assertSucceeds(setDoc(doc(A, 'users/userA'), { nickname: '에이유저', intro: '', createdAt: now, updatedAt: now })))
await t('profile: other create denied', assertFails(setDoc(doc(A, 'users/userB'), { nickname: '해커', intro: '', createdAt: now, updatedAt: now })))
await t('profile: short nickname denied', assertFails(setDoc(doc(B, 'users/userB'), { nickname: 'b', intro: '', createdAt: now, updatedAt: now })))
await t('profile: anon read', assertSucceeds(getDoc(doc(anon, 'users/userA'))))

// lessons
await t('lesson: anon create denied', assertFails(createLesson(anon, 'x')))
await t('lesson: A creates #1', assertSucceeds(createLesson(A, 'userA')))
await t('lesson: A creates #2', assertSucceeds(createLesson(A, 'userA')))
await t('lesson: create as other uid denied', assertFails(createLesson(B, 'userA')))
await t('lesson: skip number denied', assertFails(runTransaction(B, async (tx) => {
  tx.set(doc(B, 'lessons', '10'), lessonData(10, 'userB')); tx.set(doc(B, 'counters', 'lessons'), { last: 10 }) })))
await t('lesson: overwrite existing #1 denied', assertFails(runTransaction(B, async (tx) => {
  tx.set(doc(B, 'lessons', '1'), lessonData(1, 'userB')); tx.set(doc(B, 'counters', 'lessons'), { last: 3 }) })))
await t('lesson: counter bump without lesson denied', assertFails(setDoc(doc(B, 'counters/lessons'), { last: 3 })))
await t('lesson: content too short denied', assertFails(createLesson(B, 'userB', { content: '짧음' })))
await t('lesson: bad sido denied', assertFails(createLesson(B, 'userB', { sido: '화성' })))
await t('lesson: 4 learns denied', assertFails(createLesson(B, 'userB', { learns: [101, 102, 103, 104] })))
await t('lesson: teach only (legacy shape) ok', assertSucceeds(createLesson(B, 'userB', { learns: [], authorName: '비유저' })))
await t('lesson: learn only (legacy shape) ok', assertSucceeds(createLesson(B, 'userB', { teach: null, authorName: '비유저' })))
await t('lesson: neither teach nor learns denied', assertFails(createLesson(B, 'userB', { teach: null, learns: [] })))
await t('lesson: duplicate learns denied', assertFails(createLesson(B, 'userB', { learns: [101, 101] })))
await t('lesson: learns bad code denied', assertFails(createLesson(B, 'userB', { learns: [101, 5] })))
await t('lesson: neither online nor offline denied', assertFails(createLesson(B, 'userB', { online: false, offline: false })))
await t('lesson: online-only with sido denied', assertFails(createLesson(B, 'userB', { online: true, offline: false, sido: '서울' })))
await t('lesson: sido 온라인 denied (now a mode)', assertFails(createLesson(B, 'userB', { sido: '온라인' })))
await t('lesson: no ageGroups denied', assertFails(createLesson(B, 'userB', { ageGroups: [] })))
await t('lesson: bad ageGroup denied', assertFails(createLesson(B, 'userB', { ageGroups: ['60s'] })))
await t('lesson: duplicate ageGroup denied', assertFails(createLesson(B, 'userB', { ageGroups: ['20s', '20s'] })))
await t('lesson: bad day denied', assertFails(createLesson(B, 'userB', { days: ['mon', 'holiday'] })))
await t('lesson: duplicate day denied', assertFails(createLesson(B, 'userB', { days: ['mon', 'mon'] })))
await t('lesson: bad time slot denied', assertFails(createLesson(B, 'userB', { timeSlots: ['night'] })))
await t('lesson: bad level denied', assertFails(createLesson(B, 'userB', { teachLevel: 'god' })))
await t('lesson: missing new field denied', assertFails(runTransaction(B, async (tx) => {
  const c = await tx.get(doc(B, 'counters', 'lessons')); const n = c.data().last + 1
  const d = lessonData(n, 'userB'); delete d.days
  tx.set(doc(B, 'lessons', String(n)), d); tx.set(doc(B, 'counters', 'lessons'), { last: n }) })))
await t('lesson: B #3 online, 3 learns, no ages', assertSucceeds(createLesson(B, 'userB', { ageMin: null, ageMax: null, authorName: '비유저',
  online: true, offline: false, sido: '', learns: [101, 402, 401], days: [], timeSlots: [], teachLevel: '', learnLevel: 'beginner' })))
await t('lesson: anon read', assertSucceeds(getDoc(doc(anon, 'lessons/1'))))
await t('lesson: owner edit', assertSucceeds(updateDoc(doc(A, 'lessons/1'), { content: '수정된 내용입니다 열 글자 이상', updatedAt: now + 1 })))
await t('lesson: owner close', assertSucceeds(updateDoc(doc(A, 'lessons/2'), { closed: true, updatedAt: now + 1 })))
await t('lesson: other edit denied', assertFails(updateDoc(doc(B, 'lessons/1'), { content: '남의 글 수정 시도합니다아아', updatedAt: now + 1 })))
await t('lesson: owner cannot change views', assertFails(updateDoc(doc(A, 'lessons/1'), { views: 999 })))
await t('lesson: owner cannot change uid', assertFails(updateDoc(doc(A, 'lessons/1'), { uid: 'userB' })))
await t('lesson: owner cannot add field', assertFails(updateDoc(doc(A, 'lessons/1'), { evil: 1 })))
await t('lesson: anon views +1', assertSucceeds(updateDoc(doc(anon, 'lessons/1'), { views: increment(1) })))
await t('lesson: anon views +5 denied', assertFails(updateDoc(doc(anon, 'lessons/1'), { views: increment(5) })))
await t('lesson: other delete denied', assertFails(deleteDoc(doc(B, 'lessons/1'))))

// applications
const C0 = env.authenticatedContext('userC0').firestore()
await setDoc(doc(B, 'users/userB'), { nickname: '비유저', intro: '', createdAt: now, updatedAt: now })
const app = (no, uid, extra = {}) => ({ lessonNo: no, lessonOwnerUid: 'userA', lessonTeach: 204, lessonLearns: [306], applicantUid: uid,
  applicantName: '비유저', message: '신청합니다 잘 부탁드려요', status: 'pending', reply: '', createdAt: now, updatedAt: now, ...extra })
await t('app: get nonexistent own ok', assertSucceeds(getDoc(doc(B, 'applications/1_userB'))))
await t('app: B applies to #1', assertSucceeds(setDoc(doc(B, 'applications/1_userB'), app(1, 'userB'))))
await t('app: duplicate apply denied (overwrite)', assertFails(setDoc(doc(B, 'applications/1_userB'), app(1, 'userB'))))
await t('app: apply to closed #2 denied', assertFails(setDoc(doc(B, 'applications/2_userB'), app(2, 'userB'))))
await t('app: wrong owner denied', assertFails(setDoc(doc(B, 'applications/3_userB'), app(3, 'userB', { lessonOwnerUid: 'userA' }))))
await t('app: self apply denied', assertFails(setDoc(doc(A, 'applications/1_userA'), app(1, 'userA', { applicantName: '에이유저' }))))
await t('app: mismatched lessonLearns denied', assertFails(setDoc(doc(C0, 'applications/1_userC0'), app(1, 'userC0', { lessonLearns: [999], applicantName: '씨유저' }))))
await t('app: id spoof denied', assertFails(setDoc(doc(B, 'applications/1_userC'), app(1, 'userB'))))
await t('app: pre-accepted denied', assertFails(setDoc(doc(B, 'applications/3_userB'), app(3, 'userB', { lessonOwnerUid: 'userB', status: 'accepted' }))))
const C = env.authenticatedContext('userC').firestore()
await t('app: stranger get denied', assertFails(getDoc(doc(C, 'applications/1_userB'))))
await t('app: owner get', assertSucceeds(getDoc(doc(A, 'applications/1_userB'))))
await t('app: owner list', assertSucceeds(getDocs(query(collection(A, 'applications'), where('lessonOwnerUid', '==', 'userA'), where('lessonNo', '==', 1)))))
await t('app: applicant list', assertSucceeds(getDocs(query(collection(B, 'applications'), where('applicantUid', '==', 'userB')))))
await t('app: list all denied', assertFails(getDocs(collection(C, 'applications'))))
await t('app: applicant cannot accept self', assertFails(updateDoc(doc(B, 'applications/1_userB'), { status: 'accepted', updatedAt: now + 2 })))
await t('app: owner accepts with reply', assertSucceeds(updateDoc(doc(A, 'applications/1_userB'), { status: 'accepted', reply: '카톡 abc', updatedAt: now + 2 })))
await t('app: owner cannot edit message', assertFails(updateDoc(doc(A, 'applications/1_userB'), { message: '바꿔치기' })))
await t('app: stranger cannot delete', assertFails(deleteDoc(doc(C, 'applications/1_userB'))))
await t('app: applicant cancels', assertSucceeds(deleteDoc(doc(B, 'applications/1_userB'))))
await t('app: B re-applies', assertSucceeds(setDoc(doc(B, 'applications/1_userB'), app(1, 'userB'))))
await t('app: lesson owner can delete received (account deletion)', assertSucceeds(deleteDoc(doc(A, 'applications/1_userB'))))
await t('profile: own delete', assertSucceeds(deleteDoc(doc(B, 'users/userB'))))
await t('profile: other delete denied', assertFails(deleteDoc(doc(B, 'users/userA'))))

// 예전 글(나이대 없음, 숫자 범위): 작성자가 모집 완료로 바꿀 수 있어야 함
await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'lessons/900'), (() => { const d = lessonData(900, 'userA', { ageMin: 20, ageMax: 45 }); delete d.ageGroups; return d })()))
await t('lesson: legacy (no ageGroups) close ok', assertSucceeds(updateDoc(doc(A, 'lessons/900'), { closed: true, updatedAt: Date.now() })))

// admins / visits
const visit = (extra = {}) => ({ t: Date.now(), vid: 'v1', sid: 's1', entry: true, newVisitor: true, path: '/', ref: 'google.com',
  refPath: '/', source: '', medium: '', campaign: '', lang: 'ko-KR', tz: 'Asia/Seoul', country: 'KR', device: 'mobile',
  os: 'Android', browser: 'Chrome', app: false, signedIn: false,
  expireAt: Timestamp.fromMillis(Date.now() + 5 * 365 * 864e5), ...extra })
await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'admins/userA'), { createdAt: now }))
await t('admins: own check', assertSucceeds(getDoc(doc(A, 'admins/userA'))))
await t('admins: B own check (missing) ok', assertSucceeds(getDoc(doc(B, 'admins/userB'))))
await t('admins: read other denied', assertFails(getDoc(doc(B, 'admins/userA'))))
await t('admins: self-grant denied', assertFails(setDoc(doc(B, 'admins/userB'), { createdAt: now })))
await t('visits: anon create', assertSucceeds(setDoc(doc(anon, 'visits/x1'), visit())))
await t('visits: extra field denied', assertFails(setDoc(doc(anon, 'visits/x2'), visit({ ip: '1.2.3.4' }))))
await t('visits: old time denied', assertFails(setDoc(doc(anon, 'visits/x3'), visit({ t: Date.now() - 3600000 }))))
await t('visits: far expireAt denied', assertFails(setDoc(doc(anon, 'visits/x6'), visit({ expireAt: Timestamp.fromMillis(Date.now() + 3650 * 864e5) }))))
await t('visits: own uid ok', assertSucceeds(setDoc(doc(B, 'visits/u1'), visit({ uid: 'userB', signedIn: true }))))
await t('visits: other uid denied', assertFails(setDoc(doc(B, 'visits/u2'), visit({ uid: 'userA', signedIn: true }))))
await t('visits: anon with uid denied', assertFails(setDoc(doc(anon, 'visits/u3'), visit({ uid: 'userB' }))))
await t('visits: anon empty uid ok', assertSucceeds(setDoc(doc(anon, 'visits/u4'), visit({ uid: '' }))))
await t('visits: bad device denied', assertFails(setDoc(doc(anon, 'visits/x4'), visit({ device: 'robot' }))))
await t('visits: long path denied', assertFails(setDoc(doc(anon, 'visits/x5'), visit({ path: '/'.repeat(201) }))))
await t('visits: anon read denied', assertFails(getDoc(doc(anon, 'visits/x1'))))
await t('visits: non-admin list denied', assertFails(getDocs(collection(B, 'visits'))))
await t('visits: admin list', assertSucceeds(getDocs(query(collection(A, 'visits'), where('t', '>=', 0)))))
await t('visits: update denied', assertFails(updateDoc(doc(A, 'visits/x1'), { path: '/x' })))
await t('visits: delete recent denied', assertFails(deleteDoc(doc(A, 'visits/x1'))))
await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'visits/old'), visit({ t: Date.now() - 1900 * 864e5 })))
await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'visits/y2'), visit({ t: Date.now() - 730 * 864e5 })))
await t('visits: admin delete 2-year-old denied', assertFails(deleteDoc(doc(A, 'visits/y2'))))
await t('visits: non-admin delete old denied', assertFails(deleteDoc(doc(B, 'visits/old'))))
await t('visits: admin delete old', assertSucceeds(deleteDoc(doc(A, 'visits/old'))))

// members (비공개 회원 기록)
const Am = env.authenticatedContext('userA', { email: 'a@example.com' }).firestore()
const Bm = env.authenticatedContext('userB', { email: 'b@example.com' }).firestore()
const mem = (email, extra = {}) => ({ email, joinedAt: now, lastLoginAt: now, ...extra })
await t('members: own create', assertSucceeds(setDoc(doc(Bm, 'members/userB'), mem('b@example.com'))))
await t('members: wrong email denied', assertFails(setDoc(doc(Bm, 'members/userB'), mem('x@example.com'))))
await t('members: other uid denied', assertFails(setDoc(doc(Bm, 'members/userC'), mem('b@example.com'))))
await t('members: extra field denied', assertFails(setDoc(doc(Bm, 'members/userB'), mem('b@example.com', { role: 'admin' }))))
await t('members: own read', assertSucceeds(getDoc(doc(Bm, 'members/userB'))))
await t('members: anon read denied', assertFails(getDoc(doc(anon, 'members/userB'))))
await t('members: non-admin list denied', assertFails(getDocs(collection(Bm, 'members'))))
await t('members: admin get other', assertSucceeds(getDoc(doc(Am, 'members/userB'))))
await t('members: admin list', assertSucceeds(getDocs(collection(Am, 'members'))))
await t('members: own delete', assertSucceeds(deleteDoc(doc(Bm, 'members/userB'))))

// emailPrefs
await t('emailPrefs: own set', assertSucceeds(setDoc(doc(B, 'emailPrefs/userB'), { off: true, updatedAt: now })))
await t('emailPrefs: own read', assertSucceeds(getDoc(doc(B, 'emailPrefs/userB'))))
await t('emailPrefs: other read denied', assertFails(getDoc(doc(A, 'emailPrefs/userB'))))
await t('emailPrefs: other write denied', assertFails(setDoc(doc(A, 'emailPrefs/userB'), { off: false, updatedAt: now })))
await t('emailPrefs: bad field denied', assertFails(setDoc(doc(B, 'emailPrefs/userB'), { off: 'yes', updatedAt: now })))
await t('emailPrefs: own delete', assertSucceeds(deleteDoc(doc(B, 'emailPrefs/userB'))))

console.log(`\n${pass} passed, ${fail} failed`)
await env.cleanup()
process.exit(fail ? 1 : 0)
