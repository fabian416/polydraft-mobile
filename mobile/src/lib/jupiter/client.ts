/**
 * Jupiter / Explore Mode API Client (Mobile)
 *
 * High-level client for fetching market data for Explore mode.
 * Uses Kalshi Trade API v2 for live data with an in-memory cache.
 * Also supports the Jupiter Prediction Market order API.
 */

import type {
  ExploreMarket,
  ExploreOutcome,
  FetchExploreMarketsParams,
  CreateOrderRequest,
  CreateOrderResponse,
  KalshiEvent,
} from './types';
import * as KalshiApi from './prediction-api';

const PREDICTION_API_BASE = 'https://prediction-market-api.jup.ag/api/v1';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ============================================
// Cache
// ============================================

const CACHE_TTL = 30_000; // 30 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

// ============================================
// Kalshi -> ExploreMarket Transform
// ============================================

function kalshiEventToExploreMarket(params: { event: KalshiEvent }): ExploreMarket {
  const { event } = params;
  const markets = event.markets || [];

  // Binary event: single market with Yes/No
  if (markets.length === 1) {
    const market = markets[0];
    const probs = KalshiApi.getMarketProbabilities(market);

    const outcomes: ExploreOutcome[] = [
      {
        id: `${market.ticker}-yes`,
        label: 'Yes',
        probability: probs.yes,
        clob_id: market.ticker,
        ticker: market.ticker,
      },
      {
        id: `${market.ticker}-no`,
        label: 'No',
        probability: probs.no,
        clob_id: market.ticker,
        ticker: market.ticker,
      },
    ];

    let status: 'active' | 'closed' | 'resolved' = 'active';
    if (market.status === 'settled') status = 'resolved';
    else if (market.status === 'closed') status = 'closed';

    return {
      id: event.event_ticker,
      title: event.title,
      description: event.sub_title || undefined,
      category: event.category || 'other',
      volume: market.volume || 0,
      end_date: market.expiration_time || market.close_time || '',
      event_ticker: event.event_ticker,
      outcomes,
      is_binary: true,
      status,
    };
  }

  // Multi-outcome event: each market is one outcome
  const outcomes: ExploreOutcome[] = markets.map((m) => {
    const probs = KalshiApi.getMarketProbabilities(m);
    return {
      id: m.ticker,
      label: m.title || m.subtitle || m.ticker,
      probability: probs.yes,
      clob_id: m.ticker,
      ticker: m.ticker,
    };
  });

  // Determine overall status from first market
  let status: 'active' | 'closed' | 'resolved' = 'active';
  if (markets.length > 0) {
    const first = markets[0];
    if (first.status === 'settled') status = 'resolved';
    else if (first.status === 'closed') status = 'closed';
  }

  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);
  const endDate = markets[0]?.expiration_time || markets[0]?.close_time || '';

  return {
    id: event.event_ticker,
    title: event.title,
    description: event.sub_title || undefined,
    category: event.category || 'other',
    volume: totalVolume,
    end_date: endDate,
    event_ticker: event.event_ticker,
    outcomes,
    is_binary: false,
    status,
  };
}

// ============================================
// Market Fetching (Kalshi API)
// ============================================

/**
 * Fetch explore markets from Kalshi.
 */
export async function getExploreMarkets(
  params: FetchExploreMarketsParams = {}
): Promise<ExploreMarket[]> {
  const cacheKey = `markets-${JSON.stringify(params)}`;
  const cached = getCached<ExploreMarket[]>(cacheKey);
  if (cached) return cached;

  try {
    const limit = params.limit || 20;
    const response = await KalshiApi.getEvents({
      limit,
      cursor: params.cursor,
      status: params.status === 'all' ? undefined : params.status,
      with_nested_markets: true,
    });

    const markets = response.events.map((event) =>
      kalshiEventToExploreMarket({ event })
    );

    // Apply client-side filters
    let filtered = markets;

    if (params.category) {
      const cat = params.category.toLowerCase();
      filtered = filtered.filter((m) => m.category.toLowerCase() === cat);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    if (params.offset) {
      filtered = filtered.slice(params.offset);
    }

    setCache(cacheKey, filtered);
    return filtered;
  } catch (error) {
    console.error('Error fetching explore markets:', error);
    return [];
  }
}

/**
 * Get a single market/event by ID (event ticker).
 */
export async function getEventPrices(eventId: string): Promise<ExploreMarket | null> {
  const cacheKey = `event-${eventId}`;
  const cached = getCached<ExploreMarket>(cacheKey);
  if (cached) return cached;

  try {
    const event = await KalshiApi.getEvent(eventId, { with_nested_markets: true });
    if (!event) return null;

    const market = kalshiEventToExploreMarket({ event });
    setCache(cacheKey, market);
    return market;
  } catch (error) {
    console.error('Error fetching event prices:', error);
    return null;
  }
}

/**
 * Get all outcomes for a market.
 */
export async function getMarketOutcomes(marketId: string): Promise<ExploreOutcome[]> {
  const market = await getEventPrices(marketId);
  if (!market) return [];
  return market.outcomes;
}

/**
 * Refresh prices (bypasses cache).
 */
export async function refreshEventPrices(eventId: string): Promise<ExploreMarket | null> {
  cache.delete(`event-${eventId}`);
  return getEventPrices(eventId);
}

/**
 * Get featured markets sorted by volume.
 */
export async function getFeaturedMarkets(limit: number = 20): Promise<ExploreMarket[]> {
  const cacheKey = `featured-${limit}`;
  const cached = getCached<ExploreMarket[]>(cacheKey);
  if (cached) return cached;

  try {
    const markets = await getExploreMarkets({ limit: limit * 2 });
    const sorted = [...markets].sort((a, b) => b.volume - a.volume).slice(0, limit);
    setCache(cacheKey, sorted);
    return sorted;
  } catch (error) {
    console.error('Error fetching featured markets:', error);
    return [];
  }
}

// ============================================
// Conversion Helpers
// ============================================

export function usdToMicro(usd: number): string {
  return Math.floor(usd * 1_000_000).toString();
}

export function microToUsd(micro: string | number): number {
  const value = typeof micro === 'string' ? parseInt(micro, 10) : micro;
  return value / 1_000_000;
}

export function usdcToMicro(usdc: number): string {
  return Math.floor(usdc * 1_000_000).toString();
}

export function microToUsdc(micro: string | number): number {
  const value = typeof micro === 'string' ? parseInt(micro, 10) : micro;
  return value / 1_000_000;
}

// ============================================
// Jupiter Prediction Order API
// ============================================

/**
 * Create an order on Jupiter Prediction Market.
 * Returns an unsigned transaction to be signed by the user's wallet.
 */
export async function createOrder(
  request: CreateOrderRequest
): Promise<CreateOrderResponse> {
  const response = await fetch(`${PREDICTION_API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = `API ${response.status}`;
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = `${response.status}: ${
        errorData.message || errorData.error || errorData.type || JSON.stringify(errorData).slice(0, 150)
      }`;
    } catch {
      errorMessage = `${response.status}: ${responseText.slice(0, 150)}`;
    }
    throw new Error(errorMessage);
  }

  const data = JSON.parse(responseText) as CreateOrderResponse;

  if (!data.transaction) {
    const orderInfo = data.order
      ? `contracts=${data.order.contracts}, cost=${data.order.orderCostUsd}`
      : 'no order info';
    throw new Error(`No transaction generated (${orderInfo}). Check USDC balance.`);
  }

  return data;
}

/**
 * Create an order with simplified parameters.
 */
export async function createPredictionOrder(
  userPubkey: string,
  marketId: string,
  isYes: boolean,
  priceUsd: number,
  amountUsdc: number
): Promise<CreateOrderResponse> {
  return createOrder({
    userPubkey,
    marketId,
    depositMint: USDC_MINT,
    isBuy: true,
    isYes,
    maxBuyPriceUsd: usdToMicro(priceUsd),
    depositAmount: usdcToMicro(amountUsdc),
  });
}
