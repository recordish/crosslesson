// members/{uid} 채우기: 새 사이트에서 로그인한 적이 있는 계정(신규 가입 + 다시 로그인한 기존 회원)
// 이후 로그인부터는 앱이 직접 갱신합니다.   node backfill-members.mjs [--dry-run]
import { auth, db, DRY_RUN } from './admin.mjs'

const targets = []
let token
do {
  const page = await auth.listUsers(1000, token)
  for (const u of page.users) {
    if (!u.email || !u.metadata.lastSignInTime) continue // 한 번도 로그인하지 않은 이전 회원은 제외
    targets.push({
      uid: u.uid,
      data: { email: u.email, joinedAt: Date.parse(u.metadata.creationTime), lastLoginAt: Date.parse(u.metadata.lastSignInTime) },
    })
  }
  token = page.pageToken
} while (token)

const legacy = targets.filter((t) => t.uid.startsWith('legacy-')).length
console.log(`대상 ${targets.length}명 (신규 ${targets.length - legacy}, 기존 회원 ${legacy})`)
if (!DRY_RUN) {
  for (const t of targets) await db.doc(`members/${t.uid}`).set(t.data, { merge: true })
  console.log('완료')
}
