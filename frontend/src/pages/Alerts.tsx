import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMarketStore } from '@/stores/marketStore'
import RollingNumber from '@/components/RollingNumber'
import api from '@/lib/api'
import type { Alert, AlertCondition, AssetType } from '@shared/types/market.types'

// Drizzle returns numeric columns as strings — targetPrice is string at runtime
type AlertFromApi = Omit<Alert, 'targetPrice'> & { targetPrice: string }

function formatPrice(price: number, assetType: AssetType): string {
  if (assetType === 'forex') {
    return price >= 100
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  }).format(price)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Alerts() {
  const allPrices = useMarketStore((s) => s.prices)

  const [alerts, setAlerts] = useState<AlertFromApi[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  // Form state
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('above')
  const [targetPrice, setTargetPrice] = useState('')

  const selectedAsset = allPrices.find((p) => p.symbol === selectedSymbol)
  const activeAlerts = alerts.filter((a) => !a.isTriggered)
  const triggeredAlerts = alerts.filter((a) => a.isTriggered)

  useEffect(() => {
    api
      .get<{ success: boolean; data: AlertFromApi[] }>('/alerts')
      .then((res) => setAlerts(res.data.data))
      .finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setSelectedSymbol('')
    setCondition('above')
    setTargetPrice('')
    setFormError('')
    setShowForm(false)
  }

  async function handleCreate() {
    if (!selectedSymbol || !targetPrice || !selectedAsset) return
    const price = parseFloat(targetPrice)
    if (isNaN(price) || price <= 0) {
      setFormError('Enter a valid positive price.')
      return
    }

    setCreating(true)
    setFormError('')
    try {
      const res = await api.post<{ success: boolean; data: AlertFromApi }>('/alerts', {
        assetSymbol: selectedAsset.symbol,
        assetType: selectedAsset.assetType,
        condition,
        targetPrice: price,
      })
      setAlerts((prev) => [res.data.data, ...prev])
      resetForm()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response: { data: { message?: string } } }).response.data
        setFormError(data.message ?? 'Failed to create alert.')
      } else {
        setFormError('Failed to create alert.')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api.delete(`/alerts/${id}`)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Price Alerts</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + New Alert
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">New Price Alert</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Asset */}
            <div className="space-y-1.5">
              <Label>Asset</Label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset…" />
                </SelectTrigger>
                <SelectContent>
                  {(['crypto', 'forex', 'commodity'] as AssetType[]).map((type) =>
                    allPrices
                      .filter((p) => p.assetType === type)
                      .map((p) => (
                        <SelectItem key={p.symbol} value={p.symbol}>
                          {p.symbol} — {p.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as AlertCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Price rises above</SelectItem>
                  <SelectItem value="below">Price drops below</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target price */}
            <div className="space-y-1.5">
              <Label>Target price</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
              {selectedAsset && (
                <p className="text-xs text-muted-foreground">
                  Current:{' '}
                  <RollingNumber
                    value={formatPrice(selectedAsset.price, selectedAsset.assetType)}
                    className="tabular-nums"
                  />
                </p>
              )}
            </div>
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!selectedSymbol || !targetPrice || creating} size="sm">
              {creating ? 'Creating…' : 'Create alert'}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Alert list */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No alerts yet</p>
          <p className="text-sm mt-1">Create an alert to get notified by email when a price target is hit.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeAlerts.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Active ({activeAlerts.length})
              </h2>
              <AlertTable
                alerts={activeAlerts}
                allPrices={allPrices}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            </section>
          )}

          {triggeredAlerts.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Triggered ({triggeredAlerts.length})
              </h2>
              <AlertTable
                alerts={triggeredAlerts}
                allPrices={allPrices}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

interface AlertTableProps {
  alerts: AlertFromApi[]
  allPrices: ReturnType<typeof useMarketStore.getState>['prices']
  deletingId: string | null
  onDelete: (id: string) => void
}

function AlertTable({ alerts, allPrices, deletingId, onDelete }: AlertTableProps) {
  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border">
      {alerts.map((alert) => {
        const currentPrice = allPrices.find((p) => p.symbol === alert.assetSymbol)
        const target = parseFloat(alert.targetPrice)

        return (
          <div key={alert.id} className="flex items-center gap-4 px-4 py-3">
            {/* Symbol */}
            <div className="w-24 shrink-0">
              <p className="font-semibold text-sm text-foreground">{alert.assetSymbol}</p>
              <p className="text-xs text-muted-foreground capitalize">{alert.assetType}</p>
            </div>

            {/* Condition */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">
                  {alert.condition === 'above' ? 'Rises above ' : 'Drops below '}
                </span>
                <span className="font-medium tabular-nums">
                  {formatPrice(target, alert.assetType)}
                </span>
              </p>
              {alert.triggeredAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Triggered {formatDate(alert.triggeredAt)}
                </p>
              )}
              {!alert.isTriggered && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created {formatDate(alert.createdAt)}
                </p>
              )}
            </div>

            {/* Current price */}
            {currentPrice && !alert.isTriggered && (
              <div className="hidden sm:block text-right shrink-0">
                <p className="text-xs text-muted-foreground">Current</p>
                <RollingNumber
                  value={formatPrice(currentPrice.price, alert.assetType)}
                  className="text-sm tabular-nums font-medium text-foreground"
                />
              </div>
            )}

            {/* Status badge */}
            <Badge
              variant={alert.isTriggered ? 'secondary' : 'default'}
              className={!alert.isTriggered ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/10' : ''}
            >
              {alert.isTriggered ? 'Triggered' : 'Active'}
            </Badge>

            {/* Delete */}
            <button
              onClick={() => onDelete(alert.id)}
              disabled={deletingId === alert.id}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Delete alert"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
