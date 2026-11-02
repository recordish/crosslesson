import { Link } from 'react-router-dom'
import { useTitle } from '../hooks/useTitle'

export default function AboutPage() {
  useTitle('크로스레슨 소개')
  return (
    <article className="about">
      <h1 className="page-title">크로스레슨은요</h1>
      <p>
        누구나 남에게 가르쳐 줄 수 있는 것이 하나쯤은 있어요. 크로스레슨은 돈 대신 재능을 주고받는
        <strong> 재능교환 · 교환과외</strong> 플랫폼입니다. 2009년부터 수천 건의 교환이 이곳에서 시작됐어요.
      </p>
      <ol className="steps">
        <li><strong>레슨 등록</strong><span>가르쳐 줄 수 있는 것과 배우고 싶은 것을 적어요.</span></li>
        <li><strong>신청</strong><span>마음에 드는 레슨에 내가 줄 수 있는 재능을 적어 신청해요.</span></li>
        <li><strong>수락 &amp; 만남</strong><span>작성자가 수락하면 답장으로 연락처를 주고받고 만나요.</span></li>
      </ol>
      <h2>안전하게 만나요</h2>
      <ul className="tips">
        <li>처음에는 사람이 많은 공공장소나 화상으로 만나세요.</li>
        <li>레슨을 핑계로 돈을 요구하면 응하지 마세요.</li>
        <li>문제가 있으면 카카오채널로 알려 주세요.</li>
      </ul>
      <p className="actions start">
        <Link to="/" className="button">레슨 둘러보기</Link>
        <a href="https://pf.kakao.com/_CIchK" target="_blank" rel="noreferrer" className="button">카카오채널 문의</a>
      </p>
    </article>
  )
}
