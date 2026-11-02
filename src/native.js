// 안드로이드 앱(Capacitor)에서만 하는 일. 웹에서는 아무것도 하지 않습니다.
import { Capacitor } from '@capacitor/core'

export async function setupNative() {
  if (!Capacitor.isNativePlatform()) return
  document.documentElement.classList.add('is-app')
  const { App } = await import('@capacitor/app')
  // 안드로이드 뒤로가기: 이전 화면이 있으면 뒤로, 첫 화면이면 앱을 닫습니다
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.location.pathname !== '/') window.history.back()
    else App.exitApp()
  })
}
