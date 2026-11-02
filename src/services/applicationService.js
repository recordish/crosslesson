// 레슨 신청 (교환 제안)
// applications/{lessonNo}_{applicantUid}
//   { lessonNo, lessonOwnerUid, lessonTeach, lessonLearns, applicantUid, applicantName,
//     message, status: 'pending' | 'accepted' | 'rejected', reply, createdAt, updatedAt }
// - 한 사람은 레슨 하나에 한 번만 신청할 수 있습니다 (문서 id 로 보장)
// - 신청자와 레슨 작성자만 볼 수 있습니다
// - 작성자는 수락/거절과 답장(reply)만 바꿀 수 있고, 신청자는 신청을 취소(삭제)할 수 있습니다
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore/lite'
import { db } from '../firebase/config'
import { delay, readDb, writeDb } from './localDb'

export const MESSAGE_MIN = 5
export const MESSAGE_MAX = 1000
export const REPLY_MAX = 1000

export const STATUS_LABEL = { pending: '답변 대기', accepted: '수락됨', rejected: '거절됨' }

const appsCol = () => collection(db, 'applications')
const appId = (lessonNo, uid) => `${lessonNo}_${uid}`
const byNewest = (a, b) => b.createdAt - a.createdAt

export async function getMyApplication(lessonNo, uid) {
  const id = appId(lessonNo, uid)
  if (db) {
    const snap = await getDoc(doc(appsCol(), id))
    return snap.exists() ? { id, ...snap.data() } : null
  }
  const app = readDb().applications[id]
  return delay(app ? { id, ...app } : null)
}

export async function apply(user, profile, lesson, message) {
  const now = Date.now()
  const id = appId(lesson.no, user.uid)
  const data = {
    lessonNo: lesson.no,
    lessonOwnerUid: lesson.uid,
    lessonTeach: lesson.teach,
    lessonLearns: lesson.learns,
    applicantUid: user.uid,
    applicantName: profile.nickname,
    message: message.trim(),
    status: 'pending',
    reply: '',
    createdAt: now,
    updatedAt: now,
  }
  if (db) await setDoc(doc(appsCol(), id), data)
  else writeDb((d) => (d.applications[id] = data))
}

export async function cancelApplication(id) {
  if (db) await deleteDoc(doc(appsCol(), id))
  else writeDb((d) => delete d.applications[id])
}

export async function answerApplication(id, status, reply) {
  const patch = { status, reply: reply.trim(), updatedAt: Date.now() }
  if (db) await updateDoc(doc(appsCol(), id), patch)
  else writeDb((d) => (d.applications[id] = { ...d.applications[id], ...patch }))
}

async function listWhere(field, value, extra) {
  if (db) {
    const parts = [where(field, '==', value)]
    if (extra) parts.push(where(extra[0], '==', extra[1]))
    const snap = await getDocs(query(appsCol(), ...parts))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest)
  }
  return delay(
    Object.entries(readDb().applications)
      .map(([id, a]) => ({ id, ...a }))
      .filter((a) => a[field] === value && (!extra || a[extra[0]] === extra[1]))
      .sort(byNewest),
  )
}

// 내가 보낸 신청
export const getSentApplications = (uid) => listWhere('applicantUid', uid)
// 내 레슨에 들어온 신청 (lessonNo 를 주면 그 레슨만)
export const getReceivedApplications = (uid, lessonNo) =>
  listWhere('lessonOwnerUid', uid, lessonNo ? ['lessonNo', lessonNo] : null)
