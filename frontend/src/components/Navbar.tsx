import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSocketStore } from '@/stores/socketStore'
import { useWatchlistStore } from '@/stores/watchlistStore'
import api from '@/lib/api'

const PROTECTED_LINKS = [
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/alerts', label: 'Alerts' },
]

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const connected = useSocketStore((s) => s.connected)
  const connect = useSocketStore((s) => s.connect)
  const disconnect = useSocketStore((s) => s.disconnect)
  const resetWatchlist = useWatchlistStore((s) => s.reset)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } finally {
      clearAuth()
      resetWatchlist()
      // Reconnect as guest so the live feed keeps working after logout
      connect()
      navigate('/')
    }
  }

  const navLinkClass = (to: string) =>
    `px-3 py-1.5 rounded-md text-sm transition-colors ${
      location.pathname === to
        ? 'bg-accent text-accent-foreground font-medium'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
    }`

  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-bold text-foreground tracking-tight">MarketPulse</span>
          <nav className="flex items-center gap-1">
            <Link to="/" className={navLinkClass('/')}>Dashboard</Link>
            {user && PROTECTED_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={navLinkClass(to)}>{label}</Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
