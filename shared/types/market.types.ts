export type AssetType = "crypto" | "forex" | "commodity";
export type AlertCondition = "above" | "below";

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

export interface CreateAlertBody {
  assetSymbol: string;
  assetType: AssetType;
  condition: AlertCondition;
  targetPrice: number;
}

export interface AlertEmailData {
  userName: string;
  assetSymbol: string;
  assetName: string;
  condition: AlertCondition; // reusing AlertCondition ✅
  targetPrice: number;
  triggeredPrice: number;
}

export interface Alert {
  id: string;
  userId: string;
  assetSymbol: string;
  assetType: AssetType;
  condition: AlertCondition;
  targetPrice: number;
  isTriggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

// For the technical indicators results

export interface RSIResult {
  symbol: string;
  rsi: number;
  signal: "overbought" | "oversold" | "neutral";
  timestamp: string;
}

export interface MACDResult {
  symbol: string;
  macdLine: number;
  signalLine: number;
  histogram: number;
  signal: "bullish" | "bearish" | "neutral";
  timestamp: string;
}

export interface SMAResult {
  symbol: string;
  period: number;
  value: number;
  timestamp: string;
}

export interface IndicatorsResult {
  symbol: string;
  rsi: RSIResult;
  macd: MACDResult;
  sma20: SMAResult;
  sma50: SMAResult;
  timestamp: string;
}

// WebSocket events — shared between frontend and backend
// frontend knows exactly what events to listen for
export interface ServerToClientEvents {
  "prices:updated": (data: MarketPrice[]) => void;
  connected: (data: { message: string }) => void;
  "alert:triggered": (data: { alert: Alert; currentPrice: number }) => void;
}

export interface ClientToServerEvents {
  "subscribe:prices": () => void;
}
