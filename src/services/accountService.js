// 계정 삭제(회원 탈퇴): 내 데이터와 로그인 계정을 모두 지웁니다.
//   1) 본인 확인 (Google 계정 다시 고르기)
//   2) 내가 보낸 신청, 내 레슨에 온 신청
//   3) 내 레슨
//   4) 프로필 (users/{uid}), 회원 기록 (members/{uid})
//   5) 로그인 계정 (Firebase Authentication)
// 레슨 번호 카운터는 그대로 둡니다 (번호는 다시 쓰지 않음).
import { doc, deleteDoc } from 'firebase/firestore/lite'
import { db } from '../firebase/config'
import { cancelApplication, getReceivedApplications, getSentApplications } from './applicationService'
import { deleteCurrentUser, reauthenticate } from './authService'
import { deleteLesson, getLessonsByUser } from './lessonService'
import { writeDb } from './localDb'

export async function deleteAccount(user, onStep = () => {}) {
  onStep('본인 확인 중…')
  await reauthenticate()

  if (!db) {
    writeDb((d) => {
      Object.values(d.lessons).forEach((l) => l.uid === user.uid && delete d.lessons[l.no])
      Object.entries(d.applications).forEach(([id, a]) => {
        if (a.applicantUid === user.uid || a.lessonOwnerUid === user.uid) delete d.applications[id]
      })
      delete d.users[user.uid]
    })
    await deleteCurrentUser()
    return
  }

  onStep('신청 내역 지우는 중…')
  const [sent, received] = await Promise.all([getSentApplications(user.uid), getReceivedApplications(user.uid)])
  await Promise.all([...sent, ...received].map((a) => cancelApplication(a.id)))

  onStep('레슨 지우는 중…')
  const lessons = await getLessonsByUser(user.uid)
  await Promise.all(lessons.map((l) => deleteLesson(l.no)))

  onStep('프로필 지우는 중…')
  await deleteDoc(doc(db, 'users', user.uid))
  await deleteDoc(doc(db, 'members', user.uid))
  await deleteDoc(doc(db, 'emailPrefs', user.uid))

  onStep('계정 지우는 중…')
  await deleteCurrentUser()
}
