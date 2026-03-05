/**
 * Jupiter Client Tests
 */

import {
  getExploreMarkets,
  getEventPrices,
  getMarketOutcomes,
  refreshEventPrices,
  getFeaturedMarkets,
  clearCache,
  usdToMicro,
  microToUsd,
  usdcToMicro,
  microToUsdc,
  createOrder,
} from '../../../lib/jupiter/client';
import * as KalshiApi from '../../../lib/jupiter/prediction-api';
import type { KalshiEvent, KalshiMarket } from '../../../lib/jupiter/types';

// ============================================
// Mocks
// ============================================

jest.mock('../../../lib/jupiter/prediction-api');

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockedKalshiApi = KalshiApi as jest.Mocked<typeof KalshiApi>;

function makeMarket(overrides: Partial<KalshiMarket> = {}): KalshiMarket {
  return {
    ticker: 'MKT-1',
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
    expiration_time: '2025-12-31T00:00:00Z',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<KalshiEvent> = {}): KalshiEvent {
  return {
    event_ticker: 'EVT-1',
    series_ticker: 'SER-1',
    sub_title: 'Test subtitle',
    title: 'Will BTC reach 100k?',
    mutually_exclusive: true,
    category: 'crypto',
    markets: [makeMarket()],
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('Jupiter Client', () => {
  beforeEach(() => {
    clearCache();
    mockFetch.mockReset();
    mockedKalshiApi.getEvents.mockReset();
    mockedKalshiApi.getEvent.mockReset();
    mockedKalshiApi.getMarkets.mockReset();
    mockedKalshiApi.getMarketProbabilities.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // Conversion Helpers
  // ------------------------------------------
  describe('usdToMicro', () => {
    it('converts USD to micro amount', () => {
      expect(usdToMicro(1)).toBe('1000000');
      expect(usdToMicro(0.5)).toBe('500000');
      expect(usdToMicro(10.25)).toBe('10250000');
    });
  });

  describe('microToUsd', () => {
    it('converts micro amount to USD', () => {
      expect(microToUsd('1000000')).toBe(1);
      expect(microToUsd(500000)).toBe(0.5);
    });
  });

  describe('usdcToMicro', () => {
    it('converts USDC to micro', () => {
      expect(usdcToMicro(1)).toBe('1000000');
    });
  });

  describe('microToUsdc', () => {
    it('converts micro to USDC', () => {
      expect(microToUsdc('2000000')).toBe(2);
    });
  });

  // ------------------------------------------
  // getExploreMarkets
  // ------------------------------------------
  describe('getExploreMarkets', () => {
    it('fetches and transforms events into explore markets', async () => {
      mockedKalshiApi.getEvents.mockResolvedValue({
        events: [makeEvent()],
      });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.65, no: 0.35 });

      const markets = await getExploreMarkets();

      expect(markets.length).toBe(1);
      expect(markets[0].id).toBe('EVT-1');
      expect(markets[0].title).toBe('Will BTC reach 100k?');
      expect(markets[0].is_binary).toBe(true);
      expect(markets[0].outcomes.length).toBe(2);
      expect(markets[0].outcomes[0].label).toBe('Yes');
    });

    it('returns cached results on second call', async () => {
      mockedKalshiApi.getEvents.mockResolvedValue({
        events: [makeEvent()],
      });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.65, no: 0.35 });

      const first = await getExploreMarkets();
      const second = await getExploreMarkets();

      expect(mockedKalshiApi.getEvents).toHaveBeenCalledTimes(1);
      expect(first).toEqual(second);
    });

    it('filters by category', async () => {
      const events = [
        makeEvent({ event_ticker: 'EVT-CRYPTO', category: 'crypto' }),
        makeEvent({ event_ticker: 'EVT-SPORTS', category: 'sports' }),
      ];
      mockedKalshiApi.getEvents.mockResolvedValue({ events });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      const markets = await getExploreMarkets({ category: 'crypto' });
      expect(markets.length).toBe(1);
      expect(markets[0].category).toBe('crypto');
    });

    it('filters by search query', async () => {
      const events = [
        makeEvent({ event_ticker: 'EVT-1', title: 'Bitcoin to 100k' }),
        makeEvent({ event_ticker: 'EVT-2', title: 'Next president' }),
      ];
      mockedKalshiApi.getEvents.mockResolvedValue({ events });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      const markets = await getExploreMarkets({ search: 'bitcoin' });
      expect(markets.length).toBe(1);
      expect(markets[0].title).toContain('Bitcoin');
    });

    it('handles multi-outcome events', async () => {
      const multiEvent = makeEvent({
        markets: [
          makeMarket({ ticker: 'MKT-A', title: 'Option A' }),
          makeMarket({ ticker: 'MKT-B', title: 'Option B' }),
          makeMarket({ ticker: 'MKT-C', title: 'Option C' }),
        ],
      });
      mockedKalshiApi.getEvents.mockResolvedValue({ events: [multiEvent] });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.33, no: 0.67 });

      const markets = await getExploreMarkets();
      expect(markets[0].is_binary).toBe(false);
      expect(markets[0].outcomes.length).toBe(3);
    });

    it('returns empty on error', async () => {
      mockedKalshiApi.getEvents.mockRejectedValue(new Error('Network error'));

      const markets = await getExploreMarkets();
      expect(markets).toEqual([]);
    });

    it('applies offset correctly', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        makeEvent({ event_ticker: `EVT-${i}`, title: `Event ${i}` })
      );
      mockedKalshiApi.getEvents.mockResolvedValue({ events });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      const markets = await getExploreMarkets({ offset: 3 });
      expect(markets.length).toBe(2);
    });
  });

  // ------------------------------------------
  // clearCache
  // ------------------------------------------
  describe('clearCache', () => {
    it('clears cache so next call fetches fresh data', async () => {
      mockedKalshiApi.getEvents.mockResolvedValue({ events: [makeEvent()] });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      await getExploreMarkets();
      expect(mockedKalshiApi.getEvents).toHaveBeenCalledTimes(1);

      clearCache();

      await getExploreMarkets();
      expect(mockedKalshiApi.getEvents).toHaveBeenCalledTimes(2);
    });
  });

  // ------------------------------------------
  // getEventPrices
  // ------------------------------------------
  describe('getEventPrices', () => {
    it('fetches and transforms a single event', async () => {
      const event = makeEvent();
      mockedKalshiApi.getEvent.mockResolvedValue(event);
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.7, no: 0.3 });

      const result = await getEventPrices('EVT-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('EVT-1');
    });

    it('returns null when event not found', async () => {
      mockedKalshiApi.getEvent.mockResolvedValue(null);

      const result = await getEventPrices('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('caches results', async () => {
      mockedKalshiApi.getEvent.mockResolvedValue(makeEvent());
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      await getEventPrices('EVT-1');
      await getEventPrices('EVT-1');

      expect(mockedKalshiApi.getEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------
  // getMarketOutcomes
  // ------------------------------------------
  describe('getMarketOutcomes', () => {
    it('returns outcomes for a market', async () => {
      mockedKalshiApi.getEvent.mockResolvedValue(makeEvent());
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.65, no: 0.35 });

      const outcomes = await getMarketOutcomes('EVT-1');
      expect(outcomes.length).toBe(2);
      expect(outcomes[0].label).toBe('Yes');
    });

    it('returns empty array when event not found', async () => {
      mockedKalshiApi.getEvent.mockResolvedValue(null);

      const outcomes = await getMarketOutcomes('BAD');
      expect(outcomes).toEqual([]);
    });
  });

  // ------------------------------------------
  // refreshEventPrices
  // ------------------------------------------
  describe('refreshEventPrices', () => {
    it('bypasses cache and fetches fresh data', async () => {
      mockedKalshiApi.getEvent.mockResolvedValue(makeEvent());
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      await getEventPrices('EVT-1');
      await refreshEventPrices('EVT-1');

      expect(mockedKalshiApi.getEvent).toHaveBeenCalledTimes(2);
    });
  });

  // ------------------------------------------
  // getFeaturedMarkets
  // ------------------------------------------
  describe('getFeaturedMarkets', () => {
    it('returns markets sorted by volume', async () => {
      const events = [
        makeEvent({
          event_ticker: 'EVT-LO',
          markets: [makeMarket({ volume: 100 })],
        }),
        makeEvent({
          event_ticker: 'EVT-HI',
          markets: [makeMarket({ volume: 99999 })],
        }),
      ];

      mockedKalshiApi.getEvents.mockResolvedValue({ events });
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      const markets = await getFeaturedMarkets(2);
      expect(markets[0].volume).toBeGreaterThan(markets[1].volume);
    });
  });

  // ------------------------------------------
  // createOrder
  // ------------------------------------------
  describe('createOrder', () => {
    it('sends order and returns response', async () => {
      const orderResponse = {
        transaction: 'base64tx',
        txMeta: { blockhash: 'hash', lastValidBlockHeight: 123 },
        order: { contracts: '10', orderCostUsd: '5000000', estimatedTotalFeeUsd: '10000' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(orderResponse)),
      });

      const result = await createOrder({
        userPubkey: 'pubkey',
        marketId: 'MKT-1',
        depositMint: 'USDC_MINT',
        isBuy: true,
        isYes: true,
        maxBuyPriceUsd: '650000',
        depositAmount: '5000000',
      });

      expect(result.transaction).toBe('base64tx');
      expect(result.order.contracts).toBe('10');
    });

    it('throws on non-200 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ message: 'Bad request' })),
      });

      await expect(
        createOrder({
          userPubkey: 'pubkey',
          marketId: 'MKT-1',
          depositMint: 'USDC_MINT',
          isBuy: true,
          isYes: true,
          maxBuyPriceUsd: '650000',
          depositAmount: '5000000',
        })
      ).rejects.toThrow('400');
    });

    it('throws when no transaction in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              transaction: null,
              order: { contracts: '0', orderCostUsd: '0', estimatedTotalFeeUsd: '0' },
            })
          ),
      });

      await expect(
        createOrder({
          userPubkey: 'pubkey',
          marketId: 'MKT-1',
          depositMint: 'USDC_MINT',
          isBuy: true,
          isYes: true,
          maxBuyPriceUsd: '650000',
          depositAmount: '5000000',
        })
      ).rejects.toThrow('No transaction generated');
    });
  });

  // ------------------------------------------
  // Market Status Mapping
  // ------------------------------------------
  describe('market status mapping', () => {
    it('maps settled -> resolved', async () => {
      const event = makeEvent({
        markets: [makeMarket({ status: 'settled' })],
      });
      mockedKalshiApi.getEvent.mockResolvedValue(event);
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 1, no: 0 });

      const result = await getEventPrices('EVT-1');
      expect(result!.status).toBe('resolved');
    });

    it('maps closed -> closed', async () => {
      const event = makeEvent({
        markets: [makeMarket({ status: 'closed' })],
      });
      mockedKalshiApi.getEvent.mockResolvedValue(event);
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      const result = await getEventPrices('EVT-1');
      expect(result!.status).toBe('closed');
    });

    it('maps active -> active', async () => {
      const event = makeEvent({
        markets: [makeMarket({ status: 'active' })],
      });
      mockedKalshiApi.getEvent.mockResolvedValue(event);
      mockedKalshiApi.getMarketProbabilities.mockReturnValue({ yes: 0.5, no: 0.5 });

      const result = await getEventPrices('EVT-1');
      expect(result!.status).toBe('active');
    });
  });
});
