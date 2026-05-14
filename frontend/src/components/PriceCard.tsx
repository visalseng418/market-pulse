import { Link } from 'react-router-dom'
import type { MarketPrice, AssetType } from '@shared/types/market.types'
import RollingNumber from '@/components/RollingNumber'

interface Props {
  price: MarketPrice
  flash: 'up' | 'down' | null
}

const COMMODITY_DISPLAY_SYMBOL: Record<string, string> = {
  GOLD: 'XAU',
  SILVER: 'XAG',
  PLATINUM: 'XPT',
}

function formatPrice(price: number, assetType: AssetType): string {
  if (assetType === 'forex') {
    if (price >= 100) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  }).format(price)
}

export default function PriceCard({ price, flash }: Props) {
  const isPositive = price.change24h >= 0
  const displaySymbol = price.assetType === 'commodity'
    ? (COMMODITY_DISPLAY_SYMBOL[price.symbol] ?? price.symbol)
    : price.symbol

  return (
    <div
      className={`bg-card border border-border rounded-lg p-4 ${
        flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{displaySymbol}</p>
          <p className="text-xs text-muted-foreground truncate">{price.name}</p>
        </div>
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ml-2 mr-6 ${
            isPositive
              ? 'bg-green-500/10 text-green-500'
              : 'bg-red-500/10 text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}
          {price.change24h.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-end justify-between mt-1">
        <RollingNumber
          value={formatPrice(price.price, price.assetType)}
          className="text-lg font-bold text-foreground tabular-nums"
        />
        <Link
          to={`/indicators/${price.symbol}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
        >
          Indicators →
        </Link>
      </div>
    </div>
  )
}
