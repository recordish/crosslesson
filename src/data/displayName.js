// 화면에 보이는 이름: 이메일이면 '@' 앞부분만, 전화번호면 가운데를 가립니다 (01012345678 → 010****5678).
export function maskPhone(s) {
  const raw = String(s ?? '').trim()
  if (!/^[\d\s.\-+()]+$/.test(raw)) return null
  const d = raw.replace(/\D/g, '')
  return d.length >= 9 ? d.slice(0, 3) + '****' + d.slice(-4) : null
}

export function displayName(name) {
  const s = String(name ?? '').trim()
  const at = s.indexOf('@')
  const base = at > 0 ? s.slice(0, at) : s
  return maskPhone(base) ?? (base || '회원')
}
