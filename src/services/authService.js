// 인증 계층
// - Firebase: Google 로그인, 이메일/비밀번호 로그인·가입·비밀번호 재설정
// - 로컬 모드: 테스트 사용자 A/B 중 하나로 로그인 (신청 → 수락 흐름을 혼자 시험해 볼 수 있음)
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
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
  return signInWithPopup(auth, new GoogleAuthProvider())
}

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signupWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export function loginAsLocal(uid) {
  setLocalUser(uid)
}

export async function logout() {
  if (auth) await signOut(auth)
  else setLocalUser(null)
}

// Firebase 오류 코드를 한국어 안내로 바꿉니다.
export function authErrorMessage(e) {
  const messages = {
    'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
    'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해 주세요.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
    'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 해 주세요.',
    'auth/popup-closed-by-user': '로그인 창이 닫혔어요.',
    'auth/network-request-failed': '네트워크에 연결할 수 없어요.',
  }
  return messages[e?.code] ?? '로그인 중 문제가 생겼어요. 다시 시도해 주세요.'
}
