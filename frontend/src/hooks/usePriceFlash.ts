import { useRef, useState, useEffect } from 'react'
import type { MarketPrice } from '@shared/types/market.types'

type FlashMap = Record<string, 'up' | 'down'>

export function usePriceFlash(prices: MarketPrice[]): FlashMap {
  const prevPrices = useRef<Record<string, number>>({})
  const [flashMap, setFlashMap] = useState<FlashMap>({})

  useEffect(() => {
    if (prices.length === 0) return

    const newFlash: FlashMap = {}

    for (const asset of prices) {
      const prev = prevPrices.current[asset.symbol]
      if (prev !== undefined && prev !== asset.price) {
        newFlash[asset.symbol] = asset.price > prev ? 'up' : 'down'
      }
      prevPrices.current[asset.symbol] = asset.price
    }

    if (Object.keys(newFlash).length === 0) return

    setFlashMap(newFlash)
    const timer = setTimeout(() => setFlashMap({}), 900)
    return () => clearTimeout(timer)
  }, [prices])

  return flashMap
}
