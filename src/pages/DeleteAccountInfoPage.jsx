import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CONTACT_EMAIL } from '../data/site'
import { useTitle } from '../hooks/useTitle'

// 로그인 없이 볼 수 있는 계정 삭제 안내 (Google Play "계정 삭제 URL"로 등록)
export default function DeleteAccountInfoPage() {
  useTitle('계정 삭제 안내')
  const { user } = useAuth()
  return (
    <article className="policy">
      <h1>Crosslesson 계정 삭제 안내</h1>
      <p>Crosslesson(크로스레슨) 웹사이트와 안드로이드 앱의 계정은 언제든지 직접 삭제할 수 있습니다.</p>

      <h2>삭제하는 방법</h2>
      <ol>
        <li>앱 또는 웹사이트(crosslesson.com)에서 Google 계정으로 로그인합니다.</li>
        <li>위쪽 메뉴의 <strong>내 활동</strong>으로 갑니다.</li>
        <li>화면 맨 아래 <strong>계정 삭제 → 계정 삭제하기</strong>를 누르고, 안내를 확인한 뒤 본인 확인을 위해 Google 계정을 한 번 더 선택합니다.</li>
      </ol>
      <p>
        <Link to={user ? '/me' : '/login?next=%2Fme'} className="button primary">
          {user ? '내 활동으로 가서 계정 삭제하기' : '로그인하고 계정 삭제하기'}
        </Link>
      </p>

      <h2>삭제되는 정보</h2>
      <ul>
        <li>로그인 계정 정보(이메일 주소, 이름, 계정 식별자), 닉네임, 자기소개</li>
        <li>내가 올린 레슨 글</li>
        <li>내가 보낸 신청과 내 레슨에 온 신청, 답장</li>
      </ul>
      <p>위 정보는 계정을 삭제하는 즉시 지워지며 따로 보관하지 않습니다. 서버 접속 기록은 서비스 제공 업체(Google)의 정책에 따라 일정 기간 뒤 삭제됩니다.</p>

      <h2>로그인할 수 없는 경우</h2>
      <p>
        예전 크로스레슨 글을 지우고 싶지만 로그인할 수 없다면, <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 레슨 번호(예: #5858)와
        예전 닉네임을 보내 주세요. 확인 후 삭제해 드립니다.
      </p>
      <p className="meta">
        자세한 내용: <Link to="/privacy">개인정보처리방침</Link>
      </p>
    </article>
  )
}
