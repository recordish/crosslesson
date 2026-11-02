import { useCallback, useEffect, useState } from 'react'
import { listLessons } from '../services/lessonService'

// 필터에 맞는 레슨 목록 + "더 보기"
export function useLessons({ teach, learn, sido }) {
  const [lessons, setLessons] = useState([])
  const [next, setNext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listLessons({ teach, learn, sido })
      .then((page) => {
        if (cancelled) return
        setLessons(page.lessons)
        setNext(page.next)
      })
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [teach, learn, sido])

  const loadMore = useCallback(async () => {
    if (next == null) return
    setLoading(true)
    try {
      const page = await listLessons({ teach, learn, sido }, next)
      setLessons((prev) => [...prev, ...page.lessons])
      setNext(page.next)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [teach, learn, sido, next])

  return { lessons, loading, error, hasMore: next != null, loadMore }
}
