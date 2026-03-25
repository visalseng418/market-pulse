export type AssetType = "crypto" | "forex" | "commodity";

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number; // percentage change in last 24 hours
  volume24h: number | null;
  assetType: AssetType;
  timestamp: string; // ISO string
}

export interface PriceSnapshot {
  symbol: string;
  price: number;
  assetType: AssetType;
  timestamp: string;
}

// WebSocket events — shared between frontend and backend
// frontend knows exactly what events to listen for
export interface ServerToClientEvents {
  "prices:updated": (data: MarketPrice[]) => void;
  connected: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "subscribe:prices": () => void;
}
