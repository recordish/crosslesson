// 전화번호 형태의 닉네임/작성자명을 가립니다: 01012345678 → 010****5678
// (users.nickname, lessons.authorName, applications.applicantName)   node mask-phone-names.mjs [--dry-run]
import { db, DRY_RUN } from './admin.mjs'

// 숫자·하이픈·공백·점만으로 된 9자리 이상 (휴대폰·일반 전화)
export function maskPhone(s) {
  const raw = String(s ?? '').trim()
  if (!/^[\d\s.\-+()]+$/.test(raw)) return null
  const d = raw.replace(/\D/g, '')
  if (d.length < 9) return null
  return d.slice(0, 3) + '****' + d.slice(-4)
}

const targets = [
  ['users', 'nickname'],
  ['lessons', 'authorName'],
  ['applications', 'applicantName'],
]
for (const [col, field] of targets) {
  const snap = await db.collection(col).get()
  const changes = snap.docs.map((d) => [d, maskPhone(d.get(field))]).filter(([, v]) => v)
  console.log(`${col}.${field}: ${changes.length}/${snap.size}건 수정 대상`, changes.slice(0, 5).map(([, v]) => v).join(', '))
  if (DRY_RUN) continue
  for (let i = 0; i < changes.length; i += 400) {
    const batch = db.batch()
    changes.slice(i, i + 400).forEach(([d, v]) => batch.update(d.ref, { [field]: v }))
    await batch.commit()
  }
}
console.log(DRY_RUN ? '(dry-run: 변경 없음)' : '완료')
