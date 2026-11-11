// 회원 관리용 비공개 기록: members/{uid} = { email, joinedAt, lastLoginAt }
// 로그인할 때마다 본인이 갱신합니다. 관리자와 본인만 읽을 수 있습니다 (공개 프로필 users/{uid} 와 별개).
import { doc, setDoc } from 'firebase/firestore/lite'
import { db } from '../firebase/config'

const lastSent = new Set()

export async function touchMember(user) {
  if (!db || !user?.email || lastSent.has(user.uid)) return
  lastSent.add(user.uid)
  const joined = Date.parse(user.metadata?.creationTime ?? '') || Date.now()
  try {
    await setDoc(doc(db, 'members', user.uid), {
      email: user.email,
      joinedAt: joined,
      lastLoginAt: Date.now(),
    })
  } catch (e) {
    console.warn('회원 기록을 남기지 못했습니다:', e?.code ?? e)
  }
}
