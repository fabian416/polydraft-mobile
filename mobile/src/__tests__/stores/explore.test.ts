import { useExploreStore } from '../../stores/explore';
import type { ExploreMarket, PendingBet } from '../../types';

// Reset store between tests
beforeEach(() => {
  useExploreStore.getState().reset();
});

function makeMarket(id: string, title?: string): ExploreMarket {
  return {
    id,
    title: title ?? `Market ${id}`,
    category: 'sports',
    volume: 10000,
    end_date: '2026-12-31T00:00:00Z',
    outcomes: [
      { id: `${id}-yes`, label: 'Yes', probability: 0.6, clob_id: 'clob-1' },
      { id: `${id}-no`, label: 'No', probability: 0.4, clob_id: 'clob-2' },
    ],
    is_binary: true,
    status: 'active',
  };
}

describe('explore store', () => {
  describe('initial state', () => {
    it('starts empty', () => {
      const state = useExploreStore.getState();
      expect(state.markets).toEqual([]);
      expect(state.isLoadingMarkets).toBe(false);
      expect(state.marketsError).toBeNull();
      expect(state.selectedEvent).toBeNull();
      expect(state.pendingBets).toEqual([]);
      expect(state.hasMore).toBe(true);
    });
  });

  describe('setMarkets', () => {
    it('replaces market list and clears error', () => {
      const markets = [makeMarket('m1'), makeMarket('m2')];
      useExploreStore.getState().setMarkets(markets);

      const state = useExploreStore.getState();
      expect(state.markets).toEqual(markets);
      expect(state.marketsError).toBeNull();
    });

    it('sets hasMore false when fewer than 20 markets', () => {
      useExploreStore.getState().setMarkets([makeMarket('m1')]);
      expect(useExploreStore.getState().hasMore).toBe(false);
    });

    it('sets hasMore true when 20+ markets', () => {
      const markets = Array.from({ length: 20 }, (_, i) => makeMarket(`m${i}`));
      useExploreStore.getState().setMarkets(markets);
      expect(useExploreStore.getState().hasMore).toBe(true);
    });
  });

  describe('appendMarkets', () => {
    it('appends new markets without duplicates', () => {
      useExploreStore.getState().setMarkets([makeMarket('m1')]);
      useExploreStore.getState().appendMarkets(
        [makeMarket('m1'), makeMarket('m2')],
        'cursor-2'
      );

      const state = useExploreStore.getState();
      expect(state.markets).toHaveLength(2);
      expect(state.markets[0].id).toBe('m1');
      expect(state.markets[1].id).toBe('m2');
      expect(state.cursor).toBe('cursor-2');
    });
  });

  describe('loading and error states', () => {
    it('setLoadingMarkets updates loading flag', () => {
      useExploreStore.getState().setLoadingMarkets(true);
      expect(useExploreStore.getState().isLoadingMarkets).toBe(true);
    });

    it('setMarketsError sets error and clears loading', () => {
      useExploreStore.getState().setLoadingMarkets(true);
      useExploreStore.getState().setMarketsError('Network error');

      const state = useExploreStore.getState();
      expect(state.marketsError).toBe('Network error');
      expect(state.isLoadingMarkets).toBe(false);
    });
  });

  describe('event selection', () => {
    it('selectEvent sets selectedEvent and resets outcome index', () => {
      const market = makeMarket('m1');
      useExploreStore.getState().selectEvent(market);

      const state = useExploreStore.getState();
      expect(state.selectedEvent).toBe(market);
      expect(state.currentOutcomeIndex).toBe(0);
    });

    it('selectEvent(null) clears selection', () => {
      useExploreStore.getState().selectEvent(makeMarket('m1'));
      useExploreStore.getState().selectEvent(null);
      expect(useExploreStore.getState().selectedEvent).toBeNull();
    });
  });

  describe('outcome navigation', () => {
    it('nextOutcome increments index within bounds', () => {
      const market = makeMarket('m1');
      useExploreStore.getState().selectEvent(market);

      useExploreStore.getState().nextOutcome();
      expect(useExploreStore.getState().currentOutcomeIndex).toBe(1);

      // Should not exceed max
      useExploreStore.getState().nextOutcome();
      expect(useExploreStore.getState().currentOutcomeIndex).toBe(1);
    });

    it('prevOutcome decrements index within bounds', () => {
      const market = makeMarket('m1');
      useExploreStore.getState().selectEvent(market);
      useExploreStore.getState().nextOutcome(); // index = 1

      useExploreStore.getState().prevOutcome();
      expect(useExploreStore.getState().currentOutcomeIndex).toBe(0);

      // Should not go below 0
      useExploreStore.getState().prevOutcome();
      expect(useExploreStore.getState().currentOutcomeIndex).toBe(0);
    });

    it('setOutcomeIndex clamps to valid range', () => {
      const market = makeMarket('m1');
      useExploreStore.getState().selectEvent(market);

      useExploreStore.getState().setOutcomeIndex(99);
      expect(useExploreStore.getState().currentOutcomeIndex).toBe(1); // max index

      useExploreStore.getState().setOutcomeIndex(-5);
      expect(useExploreStore.getState().currentOutcomeIndex).toBe(0);
    });
  });

  describe('pending bets', () => {
    it('addPendingBet adds a bet', () => {
      const bet: PendingBet = {
        marketId: 'm1',
        outcomeId: 'o1',
        outcomeLabel: 'Yes',
        probability: 0.6,
        direction: 'yes',
      };

      useExploreStore.getState().addPendingBet(bet);
      expect(useExploreStore.getState().pendingBets).toHaveLength(1);
    });

    it('addPendingBet replaces duplicate bet for same market+outcome', () => {
      const bet1: PendingBet = {
        marketId: 'm1', outcomeId: 'o1', outcomeLabel: 'Yes',
        probability: 0.6, direction: 'yes',
      };
      const bet2: PendingBet = {
        marketId: 'm1', outcomeId: 'o1', outcomeLabel: 'Yes',
        probability: 0.7, direction: 'no',
      };

      useExploreStore.getState().addPendingBet(bet1);
      useExploreStore.getState().addPendingBet(bet2);

      const bets = useExploreStore.getState().pendingBets;
      expect(bets).toHaveLength(1);
      expect(bets[0].direction).toBe('no');
    });

    it('removePendingBet removes specific bet', () => {
      const bet: PendingBet = {
        marketId: 'm1', outcomeId: 'o1', outcomeLabel: 'Yes',
        probability: 0.6, direction: 'yes',
      };

      useExploreStore.getState().addPendingBet(bet);
      useExploreStore.getState().removePendingBet('m1', 'o1');
      expect(useExploreStore.getState().pendingBets).toHaveLength(0);
    });

    it('clearPendingBets removes all bets', () => {
      useExploreStore.getState().addPendingBet({
        marketId: 'm1', outcomeId: 'o1', outcomeLabel: 'Yes',
        probability: 0.6, direction: 'yes',
      });
      useExploreStore.getState().addPendingBet({
        marketId: 'm2', outcomeId: 'o2', outcomeLabel: 'No',
        probability: 0.4, direction: 'no',
      });

      useExploreStore.getState().clearPendingBets();
      expect(useExploreStore.getState().pendingBets).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('resets all state to initial', () => {
      useExploreStore.getState().setMarkets([makeMarket('m1')]);
      useExploreStore.getState().selectEvent(makeMarket('m1'));
      useExploreStore.getState().setLoadingMarkets(true);

      useExploreStore.getState().reset();

      const state = useExploreStore.getState();
      expect(state.markets).toEqual([]);
      expect(state.selectedEvent).toBeNull();
      expect(state.isLoadingMarkets).toBe(false);
    });
  });
});
