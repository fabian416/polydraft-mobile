/**
 * Kalshi Trade API v2 Wrapper (Mobile)
 *
 * Low-level wrapper around the Kalshi Trade API v2 for fetching
 * market data and event details. Used by the Jupiter adapter.
 *
 * Base URL: https://api.elections.kalshi.com/trade-api/v2
 */

import type {
  KalshiEvent,
  KalshiEventsResponse,
  KalshiEventResponse,
  KalshiMarket,
  KalshiMarketsResponse,
} from './types';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

// ============================================
// Request Helpers
// ============================================

async function kalshiFetch<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(`${KALSHI_API_BASE}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kalshi API ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

// ============================================
// Events
// ============================================

/**
 * Fetch events from Kalshi.
 * Events contain one or more markets (outcomes).
 */
export async function getEvents(options?: {
  limit?: number;
  cursor?: string;
  status?: string;
  series_ticker?: string;
  with_nested_markets?: boolean;
}): Promise<KalshiEventsResponse> {
  return kalshiFetch<KalshiEventsResponse>('/events', {
    limit: options?.limit,
    cursor: options?.cursor,
    status: options?.status,
    series_ticker: options?.series_ticker,
    with_nested_markets: options?.with_nested_markets,
  });
}

/**
 * Fetch a single event by ticker.
 */
export async function getEvent(
  eventTicker: string,
  options?: { with_nested_markets?: boolean }
): Promise<KalshiEvent | null> {
  try {
    const data = await kalshiFetch<KalshiEventResponse>(
      `/events/${eventTicker}`,
      { with_nested_markets: options?.with_nested_markets }
    );
    return data.event;
  } catch (error) {
    console.warn(`Error fetching event ${eventTicker}:`, error);
    return null;
  }
}

// ============================================
// Markets
// ============================================

/**
 * Fetch markets from Kalshi.
 */
export async function getMarkets(options?: {
  limit?: number;
  cursor?: string;
  event_ticker?: string;
  status?: string;
  series_ticker?: string;
  tickers?: string;
}): Promise<KalshiMarketsResponse> {
  return kalshiFetch<KalshiMarketsResponse>('/markets', {
    limit: options?.limit,
    cursor: options?.cursor,
    event_ticker: options?.event_ticker,
    status: options?.status,
    series_ticker: options?.series_ticker,
    tickers: options?.tickers,
  });
}

/**
 * Fetch a single market by ticker.
 */
export async function getMarket(ticker: string): Promise<KalshiMarket | null> {
  try {
    const data = await kalshiFetch<{ market: KalshiMarket }>(`/markets/${ticker}`);
    return data.market;
  } catch (error) {
    console.warn(`Error fetching market ${ticker}:`, error);
    return null;
  }
}

// ============================================
// Price Helpers
// ============================================

/**
 * Get the mid-price for a Kalshi market (average of bid and ask).
 * Returns a probability between 0 and 1.
 */
export function getMidPrice(market: KalshiMarket): number {
  const yesMid = (market.yes_bid + market.yes_ask) / 2;
  return yesMid / 100; // Kalshi prices are 0-100 cents
}

/**
 * Get the yes/no probabilities for a market.
 */
export function getMarketProbabilities(market: KalshiMarket): {
  yes: number;
  no: number;
} {
  const yesMid = getMidPrice(market);
  return {
    yes: yesMid,
    no: 1 - yesMid,
  };
}

/**
 * Check if a market is resolved and get the result.
 */
export function isMarketResolved(market: KalshiMarket): {
  resolved: boolean;
  result?: 'yes' | 'no';
} {
  if (market.status !== 'settled' || !market.result) {
    return { resolved: false };
  }

  const result = market.result === 'yes' || market.result === 'all_yes' ? 'yes' : 'no';
  return { resolved: true, result };
}
