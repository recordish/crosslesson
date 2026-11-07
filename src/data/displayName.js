// 이메일이 그대로 닉네임이 된 이전 회원이 있어, 화면에는 '@' 앞부분만 보여 줍니다.
export function displayName(name) {
  const s = String(name ?? '').trim()
  const at = s.indexOf('@')
  return (at > 0 ? s.slice(0, at) : s) || '회원'
}
