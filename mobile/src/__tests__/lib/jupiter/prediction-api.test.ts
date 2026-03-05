/**
 * Kalshi Prediction API (prediction-api.ts) Tests
 */

import {
  getEvents,
  getEvent,
  getMarkets,
  getMarket,
  getMidPrice,
  getMarketProbabilities,
  isMarketResolved,
} from '../../../lib/jupiter/prediction-api';
import type { KalshiMarket } from '../../../lib/jupiter/types';

// ============================================
// Mocks
// ============================================

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeMarket(overrides: Partial<KalshiMarket> = {}): KalshiMarket {
  return {
    ticker: 'MKT-YES',
    event_ticker: 'EVT-1',
    market_type: 'binary',
    title: 'Test Market',
    status: 'active',
    yes_bid: 60,
    yes_ask: 70,
    no_bid: 30,
    no_ask: 40,
    last_price: 65,
    volume: 10000,
    volume_24h: 500,
    open_interest: 2000,
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('Kalshi prediction-api', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // getEvents
  // ------------------------------------------
  describe('getEvents', () => {
    it('fetches events with correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ events: [], cursor: null }),
      });

      await getEvents({ limit: 10, with_nested_markets: true });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/events');
      expect(url).toContain('limit=10');
      expect(url).toContain('with_nested_markets=true');
    });

    it('returns events array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            events: [{ event_ticker: 'EVT-1', title: 'Test', markets: [] }],
            cursor: 'next',
          }),
      });

      const result = await getEvents();
      expect(result.events.length).toBe(1);
      expect(result.cursor).toBe('next');
    });

    it('throws on non-200 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(getEvents()).rejects.toThrow('Kalshi API 500');
    });

    it('omits undefined params from URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ events: [] }),
      });

      await getEvents({ limit: 5 });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=5');
      expect(url).not.toContain('cursor');
      expect(url).not.toContain('status');
    });
  });

  // ------------------------------------------
  // getEvent
  // ------------------------------------------
  describe('getEvent', () => {
    it('fetches single event by ticker', async () => {
      const event = { event_ticker: 'EVT-1', title: 'Test Event', markets: [] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ event }),
      });

      const result = await getEvent('EVT-1');
      expect(result).toEqual(event);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/events/EVT-1');
    });

    it('returns null on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      });

      const result = await getEvent('NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------
  // getMarkets
  // ------------------------------------------
  describe('getMarkets', () => {
    it('fetches markets with query params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ markets: [] }),
      });

      await getMarkets({ limit: 20, event_ticker: 'EVT-1', status: 'active' });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/markets');
      expect(url).toContain('limit=20');
      expect(url).toContain('event_ticker=EVT-1');
      expect(url).toContain('status=active');
    });

    it('returns markets array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ markets: [makeMarket()], cursor: 'abc' }),
      });

      const result = await getMarkets();
      expect(result.markets.length).toBe(1);
    });
  });

  // ------------------------------------------
  // getMarket
  // ------------------------------------------
  describe('getMarket', () => {
    it('fetches single market by ticker', async () => {
      const market = makeMarket();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ market }),
      });

      const result = await getMarket('MKT-YES');
      expect(result).toEqual(market);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/markets/MKT-YES');
    });

    it('returns null on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      });

      const result = await getMarket('BAD-TICKER');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------
  // Price Helpers
  // ------------------------------------------
  describe('getMidPrice', () => {
    it('returns mid-price as probability (0-1)', () => {
      const market = makeMarket({ yes_bid: 60, yes_ask: 70 });
      const mid = getMidPrice(market);
      expect(mid).toBe(0.65); // (60+70)/2/100
    });

    it('handles 0 bid/ask', () => {
      const market = makeMarket({ yes_bid: 0, yes_ask: 0 });
      expect(getMidPrice(market)).toBe(0);
    });
  });

  describe('getMarketProbabilities', () => {
    it('returns yes/no probabilities summing to 1', () => {
      const market = makeMarket({ yes_bid: 60, yes_ask: 70 });
      const probs = getMarketProbabilities(market);
      expect(probs.yes).toBeCloseTo(0.65);
      expect(probs.no).toBeCloseTo(0.35);
      expect(probs.yes + probs.no).toBeCloseTo(1.0);
    });
  });

  describe('isMarketResolved', () => {
    it('returns not resolved for active market', () => {
      const market = makeMarket({ status: 'active' });
      const result = isMarketResolved(market);
      expect(result.resolved).toBe(false);
      expect(result.result).toBeUndefined();
    });

    it('returns resolved yes for settled market with yes result', () => {
      const market = makeMarket({ status: 'settled', result: 'yes' });
      const result = isMarketResolved(market);
      expect(result.resolved).toBe(true);
      expect(result.result).toBe('yes');
    });

    it('returns resolved yes for all_yes result', () => {
      const market = makeMarket({ status: 'settled', result: 'all_yes' });
      const result = isMarketResolved(market);
      expect(result.resolved).toBe(true);
      expect(result.result).toBe('yes');
    });

    it('returns resolved no for no result', () => {
      const market = makeMarket({ status: 'settled', result: 'no' });
      const result = isMarketResolved(market);
      expect(result.resolved).toBe(true);
      expect(result.result).toBe('no');
    });

    it('returns resolved no for all_no result', () => {
      const market = makeMarket({ status: 'settled', result: 'all_no' });
      const result = isMarketResolved(market);
      expect(result.resolved).toBe(true);
      expect(result.result).toBe('no');
    });

    it('returns not resolved for settled without result', () => {
      const market = makeMarket({ status: 'settled', result: undefined });
      const result = isMarketResolved(market);
      expect(result.resolved).toBe(false);
    });
  });
});
