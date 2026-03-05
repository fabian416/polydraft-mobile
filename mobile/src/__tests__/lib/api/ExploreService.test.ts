/**
 * ExploreService Tests
 */

import { supabase } from '../../../lib/supabase/client';
import {
  getMarkets,
  getMarketById,
  getActiveEvents,
  getEventById,
} from '../../../lib/api/ExploreService';

// ============================================
// Helpers
// ============================================

function mockChain() {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'lte', 'order'];

  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });

  return chain;
}

function makeEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'evt-1',
    title: 'Will BTC hit 100k?',
    description: 'Bitcoin prediction',
    image_url: null,
    category: 'crypto',
    subcategory: 'bitcoin',
    outcome_a_label: 'Yes',
    outcome_b_label: 'No',
    outcome_a_probability: 0.65,
    outcome_b_probability: 0.35,
    supports_draw: false,
    outcome_draw_label: null,
    outcome_draw_probability: null,
    volume: 50000,
    status: 'active',
    resolution_deadline_at: '2025-12-31T00:00:00Z',
    event_start_at: null,
    polymarket_market_id: 'PM-123',
    polymarket_slug: 'btc-100k',
    venue_event_id: null,
    venue_slug: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function resetMocks() {
  (supabase.from as jest.Mock).mockReset();
}

// ============================================
// Tests
// ============================================

describe('ExploreService', () => {
  beforeEach(() => {
    resetMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // getMarkets
  // ------------------------------------------
  describe('getMarkets', () => {
    it('returns transformed explore markets', async () => {
      const events = [makeEvent()];
      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({ data: events, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getMarkets();

      expect(result.markets.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.markets[0].id).toBe('evt-1');
      expect(result.markets[0].title).toBe('Will BTC hit 100k?');
      expect(result.markets[0].outcomes.length).toBe(2);
      expect(result.markets[0].is_binary).toBe(true);
      expect(result.markets[0].status).toBe('active');
    });

    it('returns empty on error', async () => {
      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'ERR', message: 'fail' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getMarkets();
      expect(result.markets).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('handles draw outcomes', async () => {
      const drawEvent = makeEvent({
        supports_draw: true,
        outcome_a_label: 'Team A',
        outcome_b_label: 'Team B',
        outcome_draw_label: 'Draw',
        outcome_draw_probability: 0.2,
        outcome_a_probability: 0.5,
        outcome_b_probability: 0.3,
      });

      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({ data: [drawEvent], error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getMarkets();
      expect(result.markets[0].outcomes.length).toBe(3);
      expect(result.markets[0].outcomes[2].label).toBe('Draw');
      expect(result.markets[0].is_binary).toBe(false);
    });

    it('maps resolved/pending_resolution status correctly', async () => {
      const resolved = makeEvent({ status: 'resolved' });
      const pending = makeEvent({ id: 'evt-2', status: 'pending_resolution' });

      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({ data: [resolved, pending], error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getMarkets();
      expect(result.markets[0].status).toBe('resolved');
      expect(result.markets[1].status).toBe('closed');
    });

    it('queries featured polymarket IDs', async () => {
      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await getMarkets();

      expect(supabase.from).toHaveBeenCalledWith('events');
      expect(chain.in).toHaveBeenCalledWith('polymarket_id', expect.any(Array));
    });
  });

  // ------------------------------------------
  // getMarketById
  // ------------------------------------------
  describe('getMarketById', () => {
    it('returns transformed market', async () => {
      const event = makeEvent();
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: event, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getMarketById('evt-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('evt-1');
      expect(result!.category).toBe('crypto');
    });

    it('returns null on error', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: 'ERR', message: 'not found' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getMarketById('bad-id');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------
  // getActiveEvents
  // ------------------------------------------
  describe('getActiveEvents', () => {
    it('returns active events ordered by priority', async () => {
      const events = [makeEvent(), makeEvent({ id: 'evt-2' })];
      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({ data: events, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getActiveEvents();
      expect(result.length).toBe(2);
      expect(chain.in).toHaveBeenCalledWith('status', ['upcoming', 'active']);
    });

    it('returns empty on error', async () => {
      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'ERR' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getActiveEvents();
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------
  // getEventById
  // ------------------------------------------
  describe('getEventById', () => {
    it('returns event by id', async () => {
      const event = makeEvent();
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: event, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getEventById('evt-1');
      expect(result).toEqual(event);
    });

    it('returns null on error', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: null, error: { code: 'ERR' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getEventById('bad-id');
      expect(result).toBeNull();
    });
  });
});
