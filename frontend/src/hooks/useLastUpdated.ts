import { useState, useEffect } from 'react'

export function useLastUpdated(lastUpdated: Date | null): string {
  const [, tick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!lastUpdated) return 'Waiting for data…'
  const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
  if (seconds < 5) return 'Just updated'
  return `Updated ${seconds}s ago`
}
