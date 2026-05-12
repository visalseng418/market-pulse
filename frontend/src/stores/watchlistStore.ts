import { create } from 'zustand'
import type { AssetType } from '@shared/types/market.types'

export interface WatchlistItem {
  id: string
  assetSymbol: string
  assetType: AssetType
  createdAt: string
}

interface WatchlistState {
  items: WatchlistItem[]
  fetched: boolean
  setItems: (items: WatchlistItem[]) => void
  addItem: (item: WatchlistItem) => void
  removeItem: (id: string) => void
  reset: () => void
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  items: [],
  fetched: false,
  setItems: (items) => set({ items, fetched: true }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  reset: () => set({ items: [], fetched: false }),
}))
