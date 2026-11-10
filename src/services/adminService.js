// 관리자: admins/{uid} 문서가 있는 계정만 관리자입니다 (문서는 scripts/migrate/set-admin.mjs 로 만듭니다).
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore/lite'
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
