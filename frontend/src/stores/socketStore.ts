import { create } from 'zustand'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types/market.types'
import { useMarketStore } from '@/stores/marketStore'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface SocketState {
  socket: AppSocket | null
  connected: boolean
  connect: (token: string) => void
  disconnect: () => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  connect: (token) => {
    const existing = get().socket
    if (existing) existing.disconnect()

    const socket: AppSocket = io('/', {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))
    socket.on('prices:updated', (prices) => {
      useMarketStore.getState().setPrices(prices)
    })

    set({ socket })
  },
  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false })
  },
}))
