// 메일 알림 요청: 신청/답장을 저장한 뒤 메일 발송 웹 앱(Google Apps Script)을 부릅니다.
// 웹 앱은 로그인 토큰과 Firestore 의 실제 신청 내용을 확인한 뒤 받는 사람에게 Gmail 로 보냅니다 (scripts/email).
// 주소(VITE_NOTIFY_URL)가 없으면 아무것도 하지 않습니다. 실패해도 신청/답장에는 영향이 없습니다.
import { doc, getDoc, setDoc } from 'firebase/firestore/lite'
import { auth, db } from '../firebase/config'

const URL = import.meta.env.VITE_NOTIFY_URL

export async function requestNotify(type, appId) {
  if (!URL || !auth?.currentUser) return
  try {
    const idToken = await auth.currentUser.getIdToken()
    await fetch(URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type, appId, idToken }),
      keepalive: true,
    })
  } catch (e) {
    console.warn('알림 메일 요청 실패:', e)
  }
}

// 알림 메일 받기 설정: emailPrefs/{uid} = { off, updatedAt } (없으면 받기)
export async function getEmailOff(uid) {
  if (!db) return false
  const snap = await getDoc(doc(db, 'emailPrefs', uid))
  return snap.exists() && snap.data().off === true
}

export async function setEmailOff(uid, off) {
  if (!db) return
  await setDoc(doc(db, 'emailPrefs', uid), { off, updatedAt: Date.now() })
}
