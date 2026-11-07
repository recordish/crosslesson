// 이메일 형태로 저장된 닉네임/작성자명에서 '@' 뒤를 지웁니다 (users.nickname, lessons.authorName, applications.applicantName).
//   node strip-email-names.mjs --dry-run   먼저 개수만 확인
import { db, DRY_RUN } from './admin.mjs'

const strip = (s) => {
  const at = String(s ?? '').indexOf('@')
  if (at < 0) return null
  const name = s.slice(0, at).trim()
  return name.length >= 2 ? name : `${name || '회원'}님`.slice(0, 12)
}

const targets = [
  ['users', 'nickname'],
  ['lessons', 'authorName'],
  ['applications', 'applicantName'],
]
for (const [col, field] of targets) {
  const snap = await db.collection(col).get()
  const changes = snap.docs.map((d) => [d, strip(d.get(field))]).filter(([, v]) => v)
  console.log(`${col}.${field}: ${changes.length}/${snap.size}건 수정 대상`)
  if (DRY_RUN) continue
  for (let i = 0; i < changes.length; i += 400) {
    const batch = db.batch()
    changes.slice(i, i + 400).forEach(([d, v]) => batch.update(d.ref, { [field]: v }))
    await batch.commit()
  }
}
console.log(DRY_RUN ? '(dry-run: 변경 없음)' : '완료')
