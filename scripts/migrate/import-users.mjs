// 회원 이전: data/users.json → Firebase Authentication 계정(비밀번호 없음) + users/{uid} 프로필
//
// data/users.json 형식 (MySQL 회원 테이블에서 만들어 둡니다)
//   [{ "legacyId": 123, "email": "a@gmail.com", "nickname": "글로리", "intro": "",
//      "joinedAt": "2016-01-26 13:05:00" }, ...]
//
// 새 사이트는 Google 로그인만 씁니다. 비밀번호는 옮기지 않습니다.
// 예전 회원의 계정을 uid "legacy-{legacyId}" 로 이메일만 넣어 미리 만들어 두면,
// 같은 Gmail 주소로 Google 로그인했을 때 이 계정에 이어지도록 하는 것이 목표입니다
// (Firebase 기본 설정 "이메일 주소당 계정 1개" 기준).
// ⚠️ 실제 이전 전에 테스트 계정 하나로 꼭 확인하세요: 계정을 만든 뒤 그 Gmail로 로그인해서
//    uid 가 legacy-… 로 유지되는지, 예전 레슨의 수정 버튼이 보이는지.
// Gmail 이 아닌 주소(네이버, 다음 등)로 가입했던 회원은 Google 로그인으로 이어지지 않습니다.
// 프로필과 레슨은 그대로 옮겨지고, 원하면 나중에 관리자가 새 계정으로 옮겨 줄 수 있습니다.
//
// 지금 설정: Google 로그인만 쓰므로 Gmail 회원만 옮깁니다 (data/users.json 을 만들 때 Gmail 만 남김).
//   Gmail 이 아닌 회원의 계정·이메일은 저장하지 않습니다. 그 회원들의 예전 글은 읽기 전용으로 남습니다.
// Auth 에뮬레이터에서 확인함: 같은 Gmail 로 Google 로그인하면 미리 만든 legacy-… 계정에 이어지고 uid 도 그대로입니다.
//
// 실행: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-users.mjs [--dry-run]
import { auth, db, DRY_RUN, readJson, toMillis } from './admin.mjs'

const users = readJson('data/users.json')
const isEmail = (v) => typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim())

function nickname(u) {
  const n = [...String(u.nickname ?? '').trim()].slice(0, 12).join('')
  return n.length >= 2 ? n : `회원${u.legacyId}`
}

const withEmail = users.filter((u) => isEmail(u.email))
const gmail = withEmail.filter((u) => /@gmail\.com$/i.test(u.email.trim()))
console.log(
  `회원 ${users.length}명 (이메일 있음 ${withEmail.length}, 그중 Gmail ${gmail.length})` +
    (DRY_RUN ? ' (시험 실행: 저장 안 함)' : ''),
)

// 1) 로그인 계정 (1000명씩). 비밀번호 없이 이메일만.
const authUsers = withEmail.map((u) => ({
  uid: `legacy-${u.legacyId}`,
  email: u.email.trim().toLowerCase(),
  emailVerified: false,
  displayName: nickname(u),
  metadata: { creationTime: new Date(toMillis(u.joinedAt)).toUTCString() },
}))

let failed = 0
for (let i = 0; i < authUsers.length && !DRY_RUN; i += 1000) {
  const chunk = authUsers.slice(i, i + 1000)
  const result = await auth.importUsers(chunk)
  failed += result.failureCount
  result.errors.forEach((e) => console.warn(`  ✗ 회원 ${chunk[e.index].uid}: ${e.error.message}`)) // 이메일은 기록에 남기지 않음
}

// 2) 프로필 문서 (400개씩 batch). 이메일이 없는 회원도 레슨 작성자 이름을 위해 만듭니다.
for (let i = 0; i < users.length && !DRY_RUN; i += 400) {
  const batch = db.batch()
  for (const u of users.slice(i, i + 400)) {
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

console.log(DRY_RUN ? '시험 실행 끝 (저장하지 않음)' : `완료: 계정 ${authUsers.length - failed}개, 실패 ${failed}개, 프로필 ${users.length}개`)
