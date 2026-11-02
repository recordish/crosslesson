// 회원 프로필: users/{uid} = { nickname, intro, createdAt, updatedAt }
// 누구나 읽을 수 있고(레슨 작성자 소개), 본인만 쓸 수 있습니다.
import { doc, getDoc, setDoc } from 'firebase/firestore/lite'
import { db } from '../firebase/config'
import { syncAuthorName } from './lessonService'
import { delay, readDb, writeDb } from './localDb'

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 12
export const INTRO_MAX = 300

export async function getProfile(uid) {
  if (db) {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? snap.data() : null
  }
  return delay(readDb().users[uid] ?? null)
}

export async function saveProfile(uid, { nickname, intro }, previous) {
  const now = Date.now()
  const profile = {
    nickname: nickname.trim(),
    intro: intro.trim(),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  if (db) {
    await setDoc(doc(db, 'users', uid), profile)
  } else {
    writeDb((d) => {
      d.users[uid] = profile
    })
  }
  if (previous && previous.nickname !== profile.nickname) {
    await syncAuthorName(uid, profile.nickname)
  }
  return profile
}
