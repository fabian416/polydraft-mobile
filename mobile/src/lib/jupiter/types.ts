/**
 * Jupiter / Kalshi Types (Mobile)
 *
 * Types for the Explore mode and Kalshi Trade API v2.
 */

// ============================================
// Explore Market Types (Multi-Outcome Support)
// ============================================

export interface ExploreOutcome {
  id: string;
  label: string;
  probability: number;
  image_url?: string;
  image_slug?: string;
  clob_id: string;
  ticker?: string;
  jupiterMarketId?: string;
}

export interface ExploreMarket {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  category: string;
  subcategory?: string;
  volume: number;
  end_date: string;
  event_ticker?: string;
  outcomes: ExploreOutcome[];
  is_binary: boolean;
  status: 'active' | 'closed' | 'resolved';
  created_at?: string;
}

export interface PendingBet {
  marketId: string;
  outcomeId: string;
  outcomeLabel: string;
  probability: number;
  direction: 'yes' | 'no';
  amount?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ExploreMarketsResponse {
  markets: ExploreMarket[];
  cursor?: string;
  total?: number;
}

export interface ExploreMarketResponse {
  market: ExploreMarket;
}

export interface FetchExploreMarketsParams {
  limit?: number;
  offset?: number;
  cursor?: string;
  category?: string;
  status?: 'active' | 'closed' | 'all';
  search?: string;
}

// ============================================
// Jupiter Prediction API Types
// ============================================

export interface CreateOrderRequest {
  userPubkey: string;
  marketId: string;
  depositMint: string;
  isBuy: boolean;
  isYes: boolean;
  maxBuyPriceUsd: string;
  depositAmount: string;
}

export interface CreateOrderResponse {
  transaction: string;
  txMeta: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
  order: {
    orderPubkey?: string;
    contracts: string;
    orderCostUsd: string;
    estimatedTotalFeeUsd: string;
  };
}

export interface JupiterMarket {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'active' | 'closed' | 'resolved';
  outcomes?: Array<{
    id: string;
    label: string;
    probability: number;
  }>;
}

export interface JupiterApiError {
  error: string;
  message?: string;
  details?: unknown;
}

// ============================================
// Kalshi Trade API v2 Types
// ============================================

export interface KalshiEvent {
  event_ticker: string;
  series_ticker: string;
  sub_title: string;
  title: string;
  mutually_exclusive: boolean;
  category: string;
  markets: KalshiMarket[];
}

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle?: string;
  status: 'active' | 'closed' | 'settled';
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  result?: 'yes' | 'no' | 'all_no' | 'all_yes';
  close_time?: string;
  expiration_time?: string;
  expected_expiration_time?: string;
}

export interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor?: string;
}

export interface KalshiEventResponse {
  event: KalshiEvent;
}

export interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}
