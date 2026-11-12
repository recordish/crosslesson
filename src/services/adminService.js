// 관리자: admins/{uid} 문서가 있는 계정만 관리자입니다 (문서는 scripts/migrate/set-admin.mjs 로 만듭니다).
import { collection, deleteDoc, doc, getCount, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore/lite'
import { db } from '../firebase/config'

export async function isAdmin(uid) {
  if (!db || !uid) return false
  try {
    return (await getDoc(doc(db, 'admins', uid))).exists()
  } catch {
    return false
  }
}

export const MAX_VISITS = 5000

export async function listVisits(sinceMs) {
  const q = query(collection(db, 'visits'), where('t', '>=', sinceMs), orderBy('t', 'desc'), limit(MAX_VISITS))
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }))
}

const KEEP = 5 * 365 * 24 * 3600 * 1000 // 보관 기간 5년

// 5년이 지난 접속 기록 정리 (한 번에 최대 300건)
export async function purgeOldVisits() {
  const q = query(collection(db, 'visits'), where('t', '<', Date.now() - KEEP - 60000), limit(300))
  const docs = (await getDocs(q)).docs
  await Promise.all(docs.map((d) => deleteDoc(d.ref)))
  return docs.length
}

// 회원 목록: members(로그인 기록) + users(공개 프로필) + 레슨 수. 가입일 최신순.
export async function listMembers() {
  const members = (await getDocs(collection(db, 'members'))).docs.map((d) => ({ uid: d.id, ...d.data() }))
  const rows = await Promise.all(
    members.map(async (m) => {
      const [profile, lessons] = await Promise.all([
        getDoc(doc(db, 'users', m.uid)).then((s) => (s.exists() ? s.data() : null)),
        getCount(query(collection(db, 'lessons'), where('uid', '==', m.uid))).then((c) => c.data().count).catch(() => 0),
      ])
      return { ...m, legacy: m.uid.startsWith('legacy-'), nickname: profile?.nickname ?? '', intro: profile?.intro ?? '', lessons }
    }),
  )
  return rows.sort((a, b) => b.joinedAt - a.joinedAt)
}

// uid 목록 → { uid: 닉네임 } (공개 프로필에서)
export async function getNicknames(uids) {
  const entries = await Promise.all(
    [...new Set(uids)].filter(Boolean).map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid)).catch(() => null)
      return [uid, snap?.exists() ? snap.data().nickname : '']
    }),
  )
  return Object.fromEntries(entries)
}

// 최근 레슨 신청 (관리자는 읽기만 할 수 있음)
export async function listApplications(max = 200) {
  const q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'), limit(max))
  const apps = (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }))
  const owners = await getNicknames(apps.map((a) => a.lessonOwnerUid))
  return apps.map((a) => ({ ...a, ownerName: owners[a.lessonOwnerUid] ?? '' }))
}
