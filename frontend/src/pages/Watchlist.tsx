import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PriceCard from '@/components/PriceCard'
import { useMarketStore } from '@/stores/marketStore'
import { useWatchlistStore } from '@/stores/watchlistStore'
import type { WatchlistItem } from '@/stores/watchlistStore'
import { usePriceFlash } from '@/hooks/usePriceFlash'
import api from '@/lib/api'
import type { AssetType, MarketPrice } from '@shared/types/market.types'

export default function Watchlist() {
  const allPrices = useMarketStore((s) => s.prices)
  const flashMap = usePriceFlash(allPrices)

  const items = useWatchlistStore((s) => s.items)
  const fetched = useWatchlistStore((s) => s.fetched)
  const setItems = useWatchlistStore((s) => s.setItems)
  const addItem = useWatchlistStore((s) => s.addItem)
  const removeItem = useWatchlistStore((s) => s.removeItem)

  const [loading, setLoading] = useState(!fetched)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const watchedSymbols = new Set(items.map((i) => i.assetSymbol))
  const availableAssets = allPrices.filter((p) => !watchedSymbols.has(p.symbol))

  const watchlistPrices: MarketPrice[] = items
    .map((item) => allPrices.find((p) => p.symbol === item.assetSymbol))
    .filter((p): p is MarketPrice => p !== undefined)

  useEffect(() => {
    if (fetched) return
    api
      .get<{ success: boolean; data: WatchlistItem[] }>('/watchlist')
      .then((res) => setItems(res.data.data))
      .finally(() => setLoading(false))
  }, [fetched, setItems])

  async function handleAdd() {
    if (!selectedSymbol) return
    const asset = allPrices.find((p) => p.symbol === selectedSymbol)
    if (!asset) return

    setAdding(true)
    setError('')
    try {
      const res = await api.post<{ success: boolean; data: WatchlistItem }>('/watchlist', {
        assetSymbol: asset.symbol,
        assetType: asset.assetType,
      })
      addItem(res.data.data)
      setSelectedSymbol('')
      setShowAdd(false)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response: { data: { message?: string } } }).response.data
        setError(data.message ?? 'Failed to add asset.')
      } else {
        setError('Failed to add asset.')
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    try {
      await api.delete(`/watchlist/${id}`)
      removeItem(id)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Watchlist</h1>
        {!showAdd && (
          <Button
            size="sm"
            onClick={() => { setShowAdd(true); setError('') }}
            disabled={availableAssets.length === 0}
          >
            + Add Asset
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select an asset…" />
            </SelectTrigger>
            <SelectContent>
              {(['crypto', 'forex', 'commodity'] as AssetType[]).map((type) =>
                availableAssets
                  .filter((a) => a.assetType === type)
                  .map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.symbol} — {asset.name}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!selectedSymbol || adding} size="sm">
            {adding ? 'Adding…' : 'Add'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowAdd(false); setSelectedSymbol(''); setError('') }}
          >
            Cancel
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No assets yet</p>
          <p className="text-sm mt-1">Click the bookmark icon on any asset in the dashboard to add it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {watchlistPrices.map((price) => {
            const item = items.find((i) => i.assetSymbol === price.symbol)!
            return (
              <div key={price.symbol} className="relative group">
                <PriceCard price={price} flash={flashMap[price.symbol] ?? null} />
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                    w-5 h-5 flex items-center justify-center rounded-full
                    bg-background/80 hover:bg-destructive hover:text-destructive-foreground
                    text-muted-foreground disabled:opacity-50 cursor-pointer"
                  aria-label={`Remove ${price.symbol}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
