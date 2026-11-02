import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <nav>
        <Link to="/about">크로스레슨 소개</Link>
        <Link to="/privacy"><strong>개인정보처리방침</strong></Link>
      </nav>
      <p>© 2009–{new Date().getFullYear()} Crosslesson</p>
    </footer>
  )
}
