import { create } from 'zustand'
import type { MarketPrice } from '@shared/types/market.types'

interface MarketState {
  prices: MarketPrice[]
  lastUpdated: Date | null
  setPrices: (prices: MarketPrice[]) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  prices: [],
  lastUpdated: null,
  setPrices: (prices) => set({ prices, lastUpdated: new Date() }),
}))
