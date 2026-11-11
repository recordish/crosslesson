import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { subscribeAuth } from '../services/authService'
import { touchMember } from '../services/memberService'
import { getProfile } from '../services/profileService'

// user: 로그인 사용자 (없으면 null)
// profile: users/{uid} 프로필 (아직 닉네임을 정하지 않았으면 null)
// loading: 로그인 상태와 프로필을 확인하는 중이면 true
const AuthContext = createContext({ user: null, profile: null, loading: true, setProfile: () => {} })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(
    () =>
      subscribeAuth(async (u) => {
        setLoading(true)
        setUser(u)
        let p = null
        if (u) {
          touchMember(u)
          try {
            p = await getProfile(u.uid)
          } catch (e) {
            console.error('프로필을 불러오지 못했습니다:', e)
          }
        }
        setProfile(p)
        setLoading(false)
      }),
    [],
  )

  const updateProfile = useCallback((p) => setProfile(p), [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile: updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
