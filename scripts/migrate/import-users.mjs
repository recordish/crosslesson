// 회원 이전: data/users.json → Firebase Authentication + users/{uid} 프로필
//
// data/users.json 형식 (MySQL 회원 테이블에서 만들어 둡니다)
//   [{ "legacyId": 123, "email": "a@b.com", "passwordHash": "...", "salt": "",
//      "nickname": "글로리", "intro": "", "joinedAt": "2016-01-26 13:05:00" }, ...]
//
// 새 uid 는 "legacy-{legacyId}" 로 정해서, 레슨 이전 때 작성자를 그대로 이어 붙입니다.
//
// 비밀번호 해시 방식은 예전 PHP 가입 코드를 보고 HASH 로 지정합니다.
//   HASH=BCRYPT  → password_hash()            (passwordHash: "$2y$10$...")
//   HASH=MD5     → md5($pw)                   (passwordHash: 32자리 hex)
//   HASH=SHA256  → hash('sha256', $pw)        (passwordHash: 64자리 hex)
//   HASH=NONE    → 비밀번호는 옮기지 않음. 회원은 "비밀번호 재설정"으로 새 비밀번호를 만듭니다.
// ⚠️ 실제 이전 전에 테스트 계정 하나로 꼭 로그인이 되는지 확인하세요.
//
// 실행: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json HASH=BCRYPT node import-users.mjs [--dry-run]
import { auth, db, DRY_RUN, readJson, toMillis } from './admin.mjs'

const HASH = (process.env.HASH ?? 'NONE').toUpperCase()
const users = readJson('data/users.json')

function hashOptions() {
  switch (HASH) {
    case 'BCRYPT': return { hash: { algorithm: 'BCRYPT' }, encode: (h) => Buffer.from(h.replace(/^\$2y\$/, '$2a$')) }
    case 'MD5': return { hash: { algorithm: 'MD5', rounds: 0 }, encode: (h) => Buffer.from(h, 'hex') }
    case 'SHA256': return { hash: { algorithm: 'SHA256', rounds: 1 }, encode: (h) => Buffer.from(h, 'hex') }
    case 'NONE': return null
    default:
      console.error(`알 수 없는 HASH: ${HASH}`)
      process.exit(1)
  }
}

function nickname(u) {
  const n = [...String(u.nickname ?? '').trim()].slice(0, 12).join('')
  return n.length >= 2 ? n : `회원${u.legacyId}`
}

const opt = hashOptions()
const records = []
const warnings = []
for (const u of users) {
  if (!u.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email)) {
    warnings.push(`회원 ${u.legacyId}: 이메일이 없거나 형식이 잘못돼 로그인 계정은 만들지 않고 프로필만 옮깁니다`)
  }
  records.push(u)
}

console.log(`회원 ${records.length}명, 비밀번호 방식 ${HASH}${DRY_RUN ? ' (시험 실행: 저장 안 함)' : ''}`)
warnings.forEach((w) => console.warn('  ⚠️', w))

// 1) 로그인 계정 (1000명씩)
const authUsers = records
  .filter((u) => u.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email))
  .map((u) => ({
    uid: `legacy-${u.legacyId}`,
    email: u.email.trim().toLowerCase(),
    emailVerified: false,
    displayName: nickname(u),
    ...(opt && u.passwordHash ? { passwordHash: opt.encode(u.passwordHash), ...(u.salt ? { passwordSalt: Buffer.from(u.salt) } : {}) } : {}),
    metadata: { creationTime: new Date(toMillis(u.joinedAt)).toUTCString() },
  }))

let failed = 0
for (let i = 0; i < authUsers.length && !DRY_RUN; i += 1000) {
  const chunk = authUsers.slice(i, i + 1000)
  const result = await auth.importUsers(chunk, opt ? { hash: opt.hash } : undefined)
  failed += result.failureCount
  result.errors.forEach((e) => console.warn(`  ✗ ${chunk[e.index].email}: ${e.error.message}`))
}

// 2) 프로필 문서 (400개씩 batch)
for (let i = 0; i < records.length && !DRY_RUN; i += 400) {
  const batch = db.batch()
  for (const u of records.slice(i, i + 400)) {
    const joined = toMillis(u.joinedAt)
    batch.set(db.doc(`users/legacy-${u.legacyId}`), {
      nickname: nickname(u),
      intro: String(u.intro ?? '').trim().slice(0, 300),
      createdAt: joined,
      updatedAt: joined,
    })
  }
  await batch.commit()
}

console.log(DRY_RUN ? '시험 실행 끝 (저장하지 않음)' : `완료: 계정 ${authUsers.length - failed}개, 실패 ${failed}개, 프로필 ${records.length}개`)
