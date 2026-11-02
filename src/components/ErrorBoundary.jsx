import { Component } from 'react'

// 화면 하나에서 오류가 나도 사이트 전체가 하얗게 멈추지 않게 합니다.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('화면 오류:', error, info?.componentStack)
  }

  componentDidUpdate(prev) {
    // 다른 화면으로 이동하면 다시 그려 봅니다
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <p className="empty">
        이 화면을 보여주는 중에 문제가 생겼어요.
        <br />
        <a href="/">레슨 목록으로</a>
      </p>
    )
  }
}
