import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, PRIVACY_OFFICER } from '../data/site'
import { useTitle } from '../hooks/useTitle'

const EFFECTIVE = '2026년 11월 2일'

export default function PrivacyPage() {
  useTitle('개인정보처리방침')
  return (
    <article className="policy">
      <h1>개인정보처리방침</h1>
      <p className="meta">시행일: {EFFECTIVE}</p>
      <p>
        Crosslesson(크로스레슨, 이하 “서비스”)은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속하게
        처리하기 위해 다음과 같이 개인정보처리방침을 둡니다. 이 방침은 웹사이트와 안드로이드 앱에 똑같이 적용됩니다.
      </p>

      <h2>1. 처리하는 개인정보 항목</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>구분</th><th>항목</th><th>수집 시점</th></tr></thead>
          <tbody>
            <tr><td>필수</td><td>Google 계정의 이메일 주소, 이름, 프로필 사진 주소, 계정 고유 식별자</td><td>Google 로그인(회원가입) 시</td></tr>
            <tr><td>필수</td><td>닉네임</td><td>처음 로그인한 뒤 닉네임을 정할 때</td></tr>
            <tr><td>선택</td><td>자기소개</td><td>프로필을 쓸 때</td></tr>
            <tr><td>서비스 이용</td><td>레슨 글(가르칠·배울 과목, 실력·수준, 수업 방식, 지역·만날 장소, 가능한 요일·시간대, 희망 나이대, 소개 글), 신청 메시지와 답장, 작성·수정 일시, 조회수</td><td>레슨을 올리거나 신청·답장할 때</td></tr>
            <tr><td>자동 생성</td><td>접속 IP 주소, 브라우저·기기 정보, 접속 일시</td><td>서비스에 접속할 때 서버 기록으로</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        신청 메시지나 답장에 연락처(카카오톡 아이디, 전화번호 등)를 적으면 그 내용도 처리됩니다. 작성 중인 레슨 글의 임시 저장과
        조회수 중복 방지 정보는 이용자의 기기(브라우저 저장소)에만 저장되고 서버로 보내지 않습니다. 광고·분석용 쿠키나 광고 ID는 쓰지 않습니다.
      </p>

      <h2>2. 처리 목적</h2>
      <ul>
        <li>회원 식별과 로그인 유지</li>
        <li>재능교환 레슨의 게시·검색과 신청·수락·답장 기능 제공</li>
        <li>부정 이용 방지, 문의·고충 처리</li>
      </ul>

      <h2>3. 공개 범위</h2>
      <ul>
        <li><strong>누구나 볼 수 있음:</strong> 닉네임, 자기소개, 레슨 글(과목, 지역·장소, 요일·시간, 나이대, 소개 글, 조회수, 작성일)</li>
        <li><strong>신청자와 레슨 작성자만 볼 수 있음:</strong> 신청 메시지, 답장, 수락·거절 여부</li>
        <li><strong>공개하지 않음:</strong> 이메일 주소, 이름, 계정 식별자</li>
      </ul>

      <h2>4. 보유 및 이용 기간, 파기</h2>
      <ul>
        <li>회원 탈퇴 시 닉네임·자기소개, 작성한 레슨, 보낸 신청과 받은 신청, 로그인 계정 정보를 <strong>바로 삭제</strong>합니다. 탈퇴는 앱과 웹의 <Link to="/me">내 활동</Link> 화면 맨 아래에서 할 수 있습니다(<Link to="/delete-account">계정 삭제 안내</Link>).</li>
        <li>레슨 삭제, 신청 취소를 하면 해당 정보는 그때 삭제됩니다.</li>
        <li>서버 접속 기록은 서비스 제공 업체(Google)의 보관 정책에 따라 일정 기간 보관 후 삭제됩니다.</li>
        <li>전자적 파일은 복구할 수 없는 방법으로 삭제합니다.</li>
      </ul>

      <h2>5. 제3자 제공</h2>
      <p>이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 따라 요구되는 경우는 예외입니다.</p>

      <h2>6. 처리 위탁 및 국외 이전</h2>
      <p>서비스는 회원 인증, 데이터 저장, 웹사이트 운영을 위해 아래와 같이 개인정보 처리를 위탁하며, 이 과정에서 개인정보가 국외로 이전될 수 있습니다.</p>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><th>이전받는 자</th><td>Google LLC (Firebase Authentication, Cloud Firestore, Firebase Hosting)<br />연락처: <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">firebase.google.com/support/privacy</a></td></tr>
            <tr><th>이전 국가</th><td>레슨·프로필·신청 데이터는 대한민국(서울 리전)에 저장됩니다. 로그인 처리와 웹사이트 전송은 미국 등 Google이 운영하는 국외 서버를 거칠 수 있습니다.</td></tr>
            <tr><th>이전 항목</th><td>제1항의 개인정보 전체</td></tr>
            <tr><th>이전 일시·방법</th><td>서비스를 이용할 때 정보통신망을 통해 수시로 전송</td></tr>
            <tr><th>이용 목적·보유 기간</th><td>제2항의 목적 / 회원 탈퇴 또는 위탁 계약 종료 시까지</td></tr>
          </tbody>
        </table>
      </div>
      <p>국외 이전을 원하지 않으면 가입하지 않거나 탈퇴할 수 있습니다. 이 경우 로그인이 필요한 기능(레슨 등록, 신청)은 이용할 수 없습니다.</p>

      <h2>7. 예전 크로스레슨 정보의 이전</h2>
      <p>2026년 11월 2일 서비스를 새로 만들면서 예전 crosslesson.com의 정보를 다음과 같이 옮겼습니다.</p>
      <ul>
        <li>예전 사이트에 공개되어 있던 레슨 글(작성자 닉네임, 조회수, 작성일 포함)을 계속 게시합니다.</li>
        <li>레슨을 쓴 예전 회원 중 Gmail 주소로 가입한 회원의 이메일 주소, 닉네임, 가입일을 옮겨 로그인 계정을 미리 만들었습니다. 같은 Gmail로 로그인하면 예전 글을 직접 수정·삭제할 수 있습니다.</li>
        <li>그 밖의 예전 회원 정보(비밀번호, 연락처, 자기소개, 쪽지, 접속 기록 등)는 옮기지 않았습니다.</li>
        <li>예전 글의 삭제를 원하지만 로그인할 수 없는 경우 아래 연락처로 레슨 번호와 함께 요청하면 확인 후 삭제합니다.</li>
      </ul>

      <h2>8. 이용자의 권리와 행사 방법</h2>
      <p>
        이용자는 언제든지 개인정보의 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다. <Link to="/me">내 활동</Link>과{' '}
        <Link to="/profile">프로필</Link> 화면에서 직접 확인·수정·삭제할 수 있고, 이메일({CONTACT_EMAIL})로 요청할 수도 있습니다.
        요청을 받으면 지체 없이 처리합니다.
      </p>

      <h2>9. 만 14세 미만 아동</h2>
      <p>서비스는 처음 만나는 사람과 연락하고 만나는 기능이 있어 만 14세 미만 아동은 가입할 수 없습니다. 만 14세 미만으로 확인된 계정은 삭제합니다.</p>

      <h2>10. 안전성 확보 조치</h2>
      <ul>
        <li>모든 통신은 암호화(HTTPS)됩니다.</li>
        <li>데이터베이스 보안 규칙으로 신청 메시지 등은 당사자만 읽을 수 있게 제한합니다.</li>
        <li>관리 권한은 운영자 계정으로 제한합니다.</li>
      </ul>

      <h2>11. 개인정보 보호책임자</h2>
      <p>
        {PRIVACY_OFFICER}<br />
        이메일: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>12. 권익 침해 구제 방법</h2>
      <ul>
        <li>개인정보침해신고센터: privacy.kisa.or.kr / 국번 없이 118</li>
        <li>개인정보분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
        <li>대검찰청: www.spo.go.kr / 국번 없이 1301</li>
        <li>경찰청: ecrm.police.go.kr / 국번 없이 182</li>
      </ul>

      <h2>13. 방침의 변경</h2>
      <p>이 방침을 바꾸면 시행 7일 전부터 서비스 화면으로 알립니다. 이용자에게 불리한 중요한 변경은 30일 전에 알립니다.</p>
    </article>
  )
}
