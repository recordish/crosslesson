// Firebase Admin 초기화. 서비스 계정 키 파일 경로를 GOOGLE_APPLICATION_CREDENTIALS 로 넘깁니다.
//   (Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성)
// ⚠️ 키 파일은 비밀번호와 같습니다. 절대 git 에 올리지 마세요 (.gitignore 에 service-account*.json 등록됨).
import { readFileSync } from 'node:fs'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// 연습용: FIRESTORE_EMULATOR_HOST(와 FIREBASE_AUTH_EMULATOR_HOST)를 지정하면 에뮬레이터에 씁니다.
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS=./service-account.json 처럼 키 파일 경로를 지정하세요.')
  process.exit(1)
}

initializeApp(emulator ? { projectId: process.env.GCLOUD_PROJECT ?? 'demo-crosslesson' } : { credential: applicationDefault() })
export const db = getFirestore()
export const auth = getAuth()

export const DRY_RUN = process.argv.includes('--dry-run')

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`${path} 를 읽지 못했습니다: ${e.message}`)
    process.exit(1)
  }
}

// '2016-01-26 13:05:00'(한국 시간) 또는 밀리초 숫자 → 밀리초
export function toMillis(v) {
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v // 초 단위 유닉스 시간도 받습니다
  const t = Date.parse(String(v).replace(' ', 'T') + '+09:00')
  return Number.isNaN(t) ? Date.now() : t
}
