import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <nav>
        <Link to="/about">크로스레슨 소개</Link>
        <a href="https://pf.kakao.com/_CIchK" target="_blank" rel="noreferrer">카카오채널 문의</a>
      </nav>
      <p>© 2009–{new Date().getFullYear()} Crosslesson</p>
    </footer>
  )
}
