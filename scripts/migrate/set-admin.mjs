// 관리자 지정: node set-admin.mjs <Google 이메일>   (해제: --remove)
// 그 계정으로 crosslesson.com 에 한 번 로그인한 뒤에 실행하세요.
import { auth, db } from './admin.mjs'

const email = process.argv.slice(2).find((a) => a.includes('@'))
if (!email) {
  console.error('사용법: node set-admin.mjs <이메일> [--remove]')
  process.exit(1)
}
const user = await auth.getUserByEmail(email)
const ref = db.collection('admins').doc(user.uid)
if (process.argv.includes('--remove')) {
  await ref.delete()
  console.log(`관리자 해제: ${user.uid}`)
} else {
  await ref.set({ createdAt: Date.now() })
  console.log(`관리자 지정: ${user.uid}`)
}
