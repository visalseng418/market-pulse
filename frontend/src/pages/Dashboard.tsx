import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMarketStore } from '@/stores/marketStore'
import { useAuthStore } from '@/stores/authStore'
import { useWatchlistStore } from '@/stores/watchlistStore'
import type { WatchlistItem } from '@/stores/watchlistStore'
import { usePriceFlash } from '@/hooks/usePriceFlash'
import { useLastUpdated } from '@/hooks/useLastUpdated'
import PriceCard from '@/components/PriceCard'
import api from '@/lib/api'
import type { MarketPrice } from '@shared/types/market.types'

const SECTIONS: { type: MarketPrice['assetType']; label: string }[] = [
  { type: 'crypto', label: 'Crypto' },
  { type: 'forex', label: 'Forex' },
  { type: 'commodity', label: 'Commodities' },
]

export default function Dashboard() {
  const prices = useMarketStore((s) => s.prices)
  const lastUpdated = useMarketStore((s) => s.lastUpdated)
  const setPrices = useMarketStore((s) => s.setPrices)
  const flashMap = usePriceFlash(prices)
  const lastUpdatedText = useLastUpdated(lastUpdated)

  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()

  const watchlistItems = useWatchlistStore((s) => s.items)
  const watchlistFetched = useWatchlistStore((s) => s.fetched)
  const setWatchlistItems = useWatchlistStore((s) => s.setItems)
  const addWatchlistItem = useWatchlistStore((s) => s.addItem)
  const removeWatchlistItem = useWatchlistStore((s) => s.removeItem)

  const [togglingSymbol, setTogglingSymbol] = useState<string | null>(null)

  const watchedSymbols = new Set(watchlistItems.map((i) => i.assetSymbol))

  useEffect(() => {
    api
      .get<{ success: boolean; data: MarketPrice[] }>('/market/prices')
      .then((res) => setPrices(res.data.data))
  }, [setPrices])

  useEffect(() => {
    if (!token || watchlistFetched) return
    api
      .get<{ success: boolean; data: WatchlistItem[] }>('/watchlist')
      .then((res) => setWatchlistItems(res.data.data))
  }, [token, watchlistFetched, setWatchlistItems])

  async function handleWatchlistToggle(asset: MarketPrice) {
    if (!token) {
      navigate('/login')
      return
    }
    if (togglingSymbol) return
    setTogglingSymbol(asset.symbol)

    try {
      if (watchedSymbols.has(asset.symbol)) {
        const item = watchlistItems.find((i) => i.assetSymbol === asset.symbol)!
        await api.delete(`/watchlist/${item.id}`)
        removeWatchlistItem(item.id)
      } else {
        const res = await api.post<{ success: boolean; data: WatchlistItem }>('/watchlist', {
          assetSymbol: asset.symbol,
          assetType: asset.assetType,
        })
        addWatchlistItem(res.data.data)
      }
    } finally {
      setTogglingSymbol(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Live Market Prices</h1>
        <p className="text-sm text-muted-foreground">{lastUpdatedText}</p>
      </div>

      {prices.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Loading prices…</div>
      ) : (
        SECTIONS.map(({ type, label }) => {
          const group = prices.filter((p) => p.assetType === type)
          if (group.length === 0) return null
          return (
            <section key={type}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {label}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {group.map((asset) => {
                  const isWatched = watchedSymbols.has(asset.symbol)
                  const isToggling = togglingSymbol === asset.symbol
                  return (
                    <div key={asset.symbol} className="relative group">
                      <PriceCard price={asset} flash={flashMap[asset.symbol] ?? null} />
                      <button
                        onClick={() => handleWatchlistToggle(asset)}
                        disabled={isToggling}
                        className={`absolute top-2 right-2 transition-opacity disabled:opacity-50 cursor-pointer
                          w-6 h-6 flex items-center justify-center rounded
                          hover:bg-accent/70
                          ${isWatched ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        aria-label={isWatched ? `Remove ${asset.symbol} from watchlist` : `Add ${asset.symbol} to watchlist`}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 transition-colors ${
                            isWatched
                              ? 'text-primary fill-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
