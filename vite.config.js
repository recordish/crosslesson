import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 주소가 /lesson/5858 처럼 여러 단계라서 base 는 절대 경로('/')여야 합니다.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
