import { create } from 'zustand';
import type { ExploreMarket, PendingBet } from '../types';

interface ExploreState {
  // List of markets loaded
  markets: ExploreMarket[];
  isLoadingMarkets: boolean;
  marketsError: string | null;

  // Selected event for detail view
  selectedEvent: ExploreMarket | null;
  isLoadingEvent: boolean;

  // Multi-outcome carousel state
  currentOutcomeIndex: number;

  // Swipe mode state
  currentEventIndex: number;
  swipeModeEventIds: string[];

  // Pending bets (for future implementation)
  pendingBets: PendingBet[];

  // Pagination
  cursor: string | null;
  hasMore: boolean;

  // Actions
  setMarkets: (markets: ExploreMarket[]) => void;
  appendMarkets: (markets: ExploreMarket[], cursor: string | null) => void;
  setLoadingMarkets: (loading: boolean) => void;
  setMarketsError: (error: string | null) => void;

  selectEvent: (event: ExploreMarket | null) => void;
  setLoadingEvent: (loading: boolean) => void;

  setOutcomeIndex: (index: number) => void;
  nextOutcome: () => void;
  prevOutcome: () => void;

  setSwipeModeEvents: (ids: string[]) => void;
  nextEvent: () => void;
  setCurrentEventIndex: (index: number) => void;

  addPendingBet: (bet: PendingBet) => void;
  removePendingBet: (marketId: string, outcomeId: string) => void;
  clearPendingBets: () => void;

  reset: () => void;
}

const initialState = {
  markets: [],
  isLoadingMarkets: false,
  marketsError: null,
  selectedEvent: null,
  isLoadingEvent: false,
  currentOutcomeIndex: 0,
  currentEventIndex: 0,
  swipeModeEventIds: [],
  pendingBets: [],
  cursor: null,
  hasMore: true,
};

export const useExploreStore = create<ExploreState>()((set, get) => ({
  ...initialState,

  setMarkets: (markets) => {
    set({
      markets,
      marketsError: null,
      hasMore: markets.length >= 20,
    });
  },

  appendMarkets: (markets, cursor) => {
    const { markets: existing } = get();
    // Dedupe by id
    const existingIds = new Set(existing.map((m) => m.id));
    const newMarkets = markets.filter((m) => !existingIds.has(m.id));

    set({
      markets: [...existing, ...newMarkets],
      cursor,
      hasMore: markets.length >= 20,
      marketsError: null,
    });
  },

  setLoadingMarkets: (loading) => {
    set({ isLoadingMarkets: loading });
  },

  setMarketsError: (error) => {
    set({ marketsError: error, isLoadingMarkets: false });
  },

  selectEvent: (event) => {
    set({
      selectedEvent: event,
      currentOutcomeIndex: 0,
    });
  },

  setLoadingEvent: (loading) => {
    set({ isLoadingEvent: loading });
  },

  setOutcomeIndex: (index) => {
    const { selectedEvent } = get();
    if (!selectedEvent) return;

    const maxIndex = selectedEvent.outcomes.length - 1;
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    set({ currentOutcomeIndex: clampedIndex });
  },

  nextOutcome: () => {
    const { selectedEvent, currentOutcomeIndex } = get();
    if (!selectedEvent) return;

    const maxIndex = selectedEvent.outcomes.length - 1;
    if (currentOutcomeIndex < maxIndex) {
      set({ currentOutcomeIndex: currentOutcomeIndex + 1 });
    }
  },

  prevOutcome: () => {
    const { currentOutcomeIndex } = get();
    if (currentOutcomeIndex > 0) {
      set({ currentOutcomeIndex: currentOutcomeIndex - 1 });
    }
  },

  setSwipeModeEvents: (ids) => {
    set({ swipeModeEventIds: ids, currentEventIndex: 0 });
  },

  nextEvent: () => {
    const { swipeModeEventIds, currentEventIndex, markets } = get();
    const maxIndex = swipeModeEventIds.length - 1;
    if (currentEventIndex >= maxIndex) return;

    const newIndex = currentEventIndex + 1;
    const nextEventId = swipeModeEventIds[newIndex];
    const nextEvent = markets.find((m) => m.id === nextEventId) ?? null;

    set({
      currentEventIndex: newIndex,
      currentOutcomeIndex: 0,
      selectedEvent: nextEvent,
    });
  },

  setCurrentEventIndex: (index) => {
    set({ currentEventIndex: index });
  },

  addPendingBet: (bet) => {
    const { pendingBets } = get();
    const filtered = pendingBets.filter(
      (b) => !(b.marketId === bet.marketId && b.outcomeId === bet.outcomeId)
    );
    set({ pendingBets: [...filtered, bet] });
  },

  removePendingBet: (marketId, outcomeId) => {
    const { pendingBets } = get();
    set({
      pendingBets: pendingBets.filter(
        (b) => !(b.marketId === marketId && b.outcomeId === outcomeId)
      ),
    });
  },

  clearPendingBets: () => {
    set({ pendingBets: [] });
  },

  reset: () => {
    set(initialState);
  },
}));

// Selector hooks
export const useExploreMarkets = () => useExploreStore((state) => state.markets);
export const useSelectedExploreEvent = () => useExploreStore((state) => state.selectedEvent);
export const useCurrentOutcomeIndex = () => useExploreStore((state) => state.currentOutcomeIndex);
export const usePendingBets = () => useExploreStore((state) => state.pendingBets);
export const useIsLoadingMarkets = () => useExploreStore((state) => state.isLoadingMarkets);

// Computed selectors
export const useCurrentOutcome = () =>
  useExploreStore((state) => {
    const { selectedEvent, currentOutcomeIndex } = state;
    if (!selectedEvent || selectedEvent.outcomes.length === 0) return null;
    return selectedEvent.outcomes[currentOutcomeIndex] ?? null;
  });

export const useOutcomeProgress = () =>
  useExploreStore((state) => {
    const { selectedEvent, currentOutcomeIndex } = state;
    if (!selectedEvent) return { current: 0, total: 0 };
    return {
      current: currentOutcomeIndex + 1,
      total: selectedEvent.outcomes.length,
    };
  });

export const useHasPendingBetForOutcome = (marketId: string, outcomeId: string) =>
  useExploreStore((state) =>
    state.pendingBets.some(
      (b) => b.marketId === marketId && b.outcomeId === outcomeId
    )
  );
