// firestore.rules 테스트. 실행: cd tests/rules && npm install && npm test
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, runTransaction, collection, query, where, getDocs } from 'firebase/firestore'

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
  ageMin: 20, ageMax: 45, content: '바이올린 가르쳐 드려요, 영상편집 배우고 싶어요', closed: false, views: 0, createdAt: now, updatedAt: now, ...extra })

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
await t('app: owner cannot delete', assertFails(deleteDoc(doc(A, 'applications/1_userB'))))
await t('app: applicant cancels', assertSucceeds(deleteDoc(doc(B, 'applications/1_userB'))))

console.log(`\n${pass} passed, ${fail} failed`)
await env.cleanup()
process.exit(fail ? 1 : 0)
