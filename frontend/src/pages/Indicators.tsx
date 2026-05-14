import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useMarketStore } from '@/stores/marketStore'
import api from '@/lib/api'
import type { IndicatorsResult, AssetType } from '@shared/types/market.types'

interface SnapshotPoint {
  price: number
  timestamp: string
}

interface HistoryResponse {
  symbol: string
  snapshots: SnapshotPoint[]
}

interface ChartPoint {
  time: string
  price: number
  sma20: number | null
  sma50: number | null
}

function computeSMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null
    const slice = prices.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

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

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })
}

const RSI_SIGNAL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  overbought: { bg: 'bg-red-500/10',    text: 'text-red-500',    label: 'Overbought' },
  oversold:   { bg: 'bg-green-500/10',  text: 'text-green-500',  label: 'Oversold'   },
  neutral:    { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Neutral'    },
}

const MACD_SIGNAL_STYLES: Record<string, { bg: string; text: string }> = {
  bullish: { bg: 'bg-green-500/10', text: 'text-green-500' },
  bearish: { bg: 'bg-red-500/10',   text: 'text-red-500'  },
  neutral: { bg: 'bg-secondary',    text: 'text-secondary-foreground' },
}

export default function Indicators() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const allPrices = useMarketStore((s) => s.prices)

  const asset = allPrices.find((p) => p.symbol === symbol?.toUpperCase())

  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [indicators, setIndicators] = useState<IndicatorsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!symbol) return
    const sym = symbol.toUpperCase()

    setLoading(true)
    setError('')

    Promise.all([
      api.get<{ success: boolean; data: HistoryResponse }>(`/indicators/${sym}/history`),
      api.get<{ success: boolean; data: IndicatorsResult }>(`/indicators/${sym}`),
    ])
      .then(([histRes, indRes]) => {
        const snapshots = histRes.data.data.snapshots
        const prices = snapshots.map((s) => s.price)
        const sma20s = computeSMA(prices, 20)
        const sma50s = computeSMA(prices, 50)

        setChartData(
          snapshots.map((s, i) => ({
            time: formatTimestamp(s.timestamp),
            price: s.price,
            sma20: sma20s[i],
            sma50: sma50s[i],
          })),
        )
        setIndicators(indRes.data.data)
      })
      .catch((err: unknown) => {
        if (err && typeof err === 'object' && 'response' in err) {
          const data = (err as { response: { data: { message?: string } } }).response.data
          setError(data.message ?? 'Failed to load indicator data.')
        } else {
          setError('Failed to load indicator data.')
        }
      })
      .finally(() => setLoading(false))
  }, [symbol])

  const assetType: AssetType = asset?.assetType ?? 'crypto'

  const yTickFormatter = (v: number) => {
    if (assetType === 'forex') return v.toFixed(4)
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(2)}`
  }

  const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
    const labels: Record<string, string> = { price: 'Price', sma20: 'SMA 20', sma50: 'SMA 50' }
    const key = String(name ?? '')
    return [formatPrice(value as number, assetType), labels[key] ?? key]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {symbol?.toUpperCase()} Indicators
          </h1>
          {asset && (
            <p className="text-sm text-muted-foreground capitalize">
              {asset.name} &middot; {asset.assetType}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-center py-24">
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Technical indicators require at least 50 price snapshots.
          </p>
        </div>
      ) : (
        <>
          {/* Price + SMA Chart */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Price History with SMA</h2>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  interval={6}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={yTickFormatter}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  formatter={(value) => {
                    const map: Record<string, string> = { price: 'Price', sma20: 'SMA 20', sma50: 'SMA 50' }
                    return map[value as string] ?? value
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--primary)"
                  dot={false}
                  strokeWidth={1.5}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="sma20"
                  stroke="#f97316"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="sma50"
                  stroke="#a855f7"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* RSI + MACD cards */}
          {indicators && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RSICard rsi={indicators.rsi.rsi} signal={indicators.rsi.signal} />
              <MACDCard macd={indicators.macd} />
            </div>
          )}

          {/* SMA summary row */}
          {indicators && (
            <div className="grid grid-cols-2 gap-4">
              <SMACard label="SMA 20" value={indicators.sma20.value} assetType={assetType} />
              <SMACard label="SMA 50" value={indicators.sma50.value} assetType={assetType} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RSICard({ rsi, signal }: { rsi: number; signal: string }) {
  const style = RSI_SIGNAL_STYLES[signal] ?? RSI_SIGNAL_STYLES.neutral
  const barColor =
    signal === 'overbought' ? 'bg-red-500' : signal === 'oversold' ? 'bg-green-500' : 'bg-yellow-500'

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">RSI (14)</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>
      <p className="text-3xl font-bold tabular-nums text-foreground">{rsi.toFixed(2)}</p>
      <div className="space-y-1">
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(rsi, 100)}%` }}
          />
          <div className="absolute top-0 h-full w-px bg-border/60" style={{ left: '30%' }} />
          <div className="absolute top-0 h-full w-px bg-border/60" style={{ left: '70%' }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 · Oversold &lt;30</span>
          <span>&gt;70 Overbought · 100</span>
        </div>
      </div>
    </div>
  )
}

function MACDCard({ macd }: { macd: IndicatorsResult['macd'] }) {
  const style = MACD_SIGNAL_STYLES[macd.signal] ?? MACD_SIGNAL_STYLES.neutral

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">MACD</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${style.bg} ${style.text}`}>
          {macd.signal}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        <StatItem label="MACD Line" value={macd.macdLine.toFixed(4)} />
        <StatItem label="Signal Line" value={macd.signalLine.toFixed(4)} />
        <StatItem
          label="Histogram"
          value={macd.histogram.toFixed(4)}
          valueClass={macd.histogram >= 0 ? 'text-green-500' : 'text-red-500'}
        />
      </div>
    </div>
  )
}

function SMACard({ label, value, assetType }: { label: string; value: number; assetType: AssetType }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-bold tabular-nums text-foreground">
        {formatPrice(value, assetType)}
      </span>
    </div>
  )
}

function StatItem({
  label,
  value,
  valueClass = 'text-foreground',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  )
}
