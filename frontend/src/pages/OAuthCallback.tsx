import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSocketStore } from '@/stores/socketStore'
import { useWatchlistStore } from '@/stores/watchlistStore'
import api from '@/lib/api'

export default function OAuthCallback() {
  const [error, setError] = useState('')
  const ran = useRef(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const connect = useSocketStore((s) => s.connect)
  const resetWatchlist = useWatchlistStore((s) => s.reset)
  const navigate = useNavigate()

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      setError('Authentication failed. No token received.')
      return
    }

    // Remove token from URL before fetching user — avoids it sitting in history
    window.history.replaceState({}, '', '/auth/callback')

    api
      .get<{ success: boolean; data: { id: string; name: string; email: string } }>(
        '/auth/me',
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then(({ data }) => {
        resetWatchlist()
        setAuth(token, data.data)
        connect(token)
        navigate('/', { replace: true })
      })
      .catch(() => {
        setError('Authentication failed. Please try again.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
