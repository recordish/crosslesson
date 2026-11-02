// 인증 계층
// - Firebase: Google 로그인만 씁니다
// - 로컬 모드: 테스트 사용자 A/B 중 하나로 로그인 (신청 → 수락 흐름을 혼자 시험해 볼 수 있음)
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from '../firebase/config'

export const LOCAL_USERS = [
  { uid: 'local-a', label: '테스트 사용자 A' },
  { uid: 'local-b', label: '테스트 사용자 B' },
]
const LOCAL_KEY = 'crosslesson:localUser'
const listeners = new Set()

function localUser() {
  try {
    const uid = localStorage.getItem(LOCAL_KEY)
    return LOCAL_USERS.some((u) => u.uid === uid) ? { uid } : null
  } catch {
    return null
  }
}

function setLocalUser(uid) {
  if (uid) localStorage.setItem(LOCAL_KEY, uid)
  else localStorage.removeItem(LOCAL_KEY)
  listeners.forEach((cb) => cb(localUser()))
}

export function subscribeAuth(callback) {
  if (auth) return onAuthStateChanged(auth, callback)
  listeners.add(callback)
  callback(localUser())
  return () => listeners.delete(callback)
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' }) // 여러 Google 계정 중 고를 수 있게
  return signInWithPopup(auth, provider)
}

export function loginAsLocal(uid) {
  setLocalUser(uid)
}

export async function logout() {
  if (auth) await signOut(auth)
  else setLocalUser(null)
}

// Firebase 오류 코드를 한국어 안내로 바꿉니다. 사용자가 창을 닫은 경우는 null (안내 안 함)
export function authErrorMessage(e) {
  const messages = {
    'auth/popup-closed-by-user': null,
    'auth/cancelled-popup-request': null,
    'auth/popup-blocked': '팝업이 차단됐어요. 브라우저 주소창의 팝업 차단을 풀고 다시 눌러 주세요.',
    'auth/network-request-failed': '네트워크에 연결할 수 없어요.',
    'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 해 주세요.',
    'auth/unauthorized-domain': '이 주소에서는 로그인할 수 없어요. 관리자에게 알려 주세요.',
  }
  return e?.code in messages ? messages[e.code] : 'Google 로그인 중 문제가 생겼어요. 다시 시도해 주세요.'
}
