import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import { AuthProvider } from './contexts/AuthContext'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'
import LessonFormPage from './pages/LessonFormPage'
import LessonPage from './pages/LessonPage'
import LoginPage from './pages/LoginPage'
import MyPage from './pages/MyPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'

// 주소를 /lesson/5858 처럼 깔끔하게 쓰려고 BrowserRouter 를 씁니다.
// 서버가 없는 경로도 index.html 을 돌려줘야 합니다 → public/.htaccess (카페24), firebase.json (Firebase Hosting)
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lesson/:no" element={<LessonPage />} />
            <Route path="/lesson/:no/edit" element={<ProtectedRoute><LessonFormPage /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><LessonFormPage /></ProtectedRoute>} />
            <Route path="/me" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requireProfile={false}><ProfilePage /></ProtectedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}
