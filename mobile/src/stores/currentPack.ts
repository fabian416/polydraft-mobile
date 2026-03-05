import { create } from 'zustand';
import type { UserPack, UserPick, Event, Outcome } from '../types';

interface CurrentPackState {
  // Current pack being played
  pack: UserPack | null;

  // Events in the pack (for draft phase)
  events: Event[];

  // User's picks (eventId -> outcome)
  picks: Map<string, Outcome>;

  // Draft phase state
  isDraftComplete: boolean;
  currentDraftIndex: number;

  // Resolution phase state
  revealQueue: UserPick[];
  currentRevealIndex: number;
  isRevealing: boolean;

  // Actions
  setPack: (pack: UserPack, events: Event[]) => void;
  setDraftPick: (eventId: string, outcome: Outcome) => void;
  removeDraftPick: (eventId: string) => void;
  completeDraft: (picks: UserPick[]) => void;
  advanceDraft: () => void;

  // Resolution actions
  setRevealQueue: (picks: UserPick[]) => void;
  startReveal: () => void;
  completeReveal: () => void;
  advanceReveal: () => void;

  // Reset
  clearPack: () => void;
}

export const useCurrentPackStore = create<CurrentPackState>()((set, get) => ({
  // Initial state
  pack: null,
  events: [],
  picks: new Map(),
  isDraftComplete: false,
  currentDraftIndex: 0,
  revealQueue: [],
  currentRevealIndex: 0,
  isRevealing: false,

  // Set pack and events for draft phase
  setPack: (pack, events) => {
    set({
      pack,
      events,
      picks: new Map(),
      isDraftComplete: false,
      currentDraftIndex: 0,
      revealQueue: pack.picks ?? [],
      currentRevealIndex: pack.current_reveal_index,
    });
  },

  // Set a pick during draft
  setDraftPick: (eventId, outcome) => {
    const { picks } = get();
    const newPicks = new Map(picks);
    newPicks.set(eventId, outcome);
    set({ picks: newPicks });
  },

  // Remove a pick during draft
  removeDraftPick: (eventId) => {
    const { picks } = get();
    const newPicks = new Map(picks);
    newPicks.delete(eventId);
    set({ picks: newPicks });
  },

  // Complete draft phase
  completeDraft: (picks) => {
    set({
      isDraftComplete: true,
      revealQueue: picks,
    });
  },

  // Advance to next draft card
  advanceDraft: () => {
    const { currentDraftIndex, events } = get();
    if (currentDraftIndex < events.length - 1) {
      set({ currentDraftIndex: currentDraftIndex + 1 });
    }
  },

  // Set reveal queue for resolution phase
  setRevealQueue: (picks) => {
    set({ revealQueue: picks });
  },

  // Start reveal animation
  startReveal: () => {
    set({ isRevealing: true });
  },

  // Complete reveal animation
  completeReveal: () => {
    set({ isRevealing: false });
  },

  // Advance to next reveal
  advanceReveal: () => {
    const { currentRevealIndex, revealQueue, pack } = get();
    const newIndex = currentRevealIndex + 1;

    // Update local state
    set({
      currentRevealIndex: newIndex,
      isRevealing: false,
    });

    // Check if pack is fully resolved
    if (newIndex >= revealQueue.length && pack) {
      set({
        pack: {
          ...pack,
          resolution_status: 'fully_resolved',
          current_reveal_index: newIndex,
        },
      });
    }
  },

  // Clear pack state
  clearPack: () => {
    set({
      pack: null,
      events: [],
      picks: new Map(),
      isDraftComplete: false,
      currentDraftIndex: 0,
      revealQueue: [],
      currentRevealIndex: 0,
      isRevealing: false,
    });
  },
}));

// Selector hooks
export const useCurrentPack = () => useCurrentPackStore((state) => state.pack);
export const usePackEvents = () => useCurrentPackStore((state) => state.events);
export const useDraftPicks = () => useCurrentPackStore((state) => state.picks);
export const useIsDraftComplete = () => useCurrentPackStore((state) => state.isDraftComplete);
export const useRevealQueue = () => useCurrentPackStore((state) => state.revealQueue);

// Computed selectors
export const usePickCount = () =>
  useCurrentPackStore((state) => state.picks.size);

export const useCanSubmitDraft = () =>
  useCurrentPackStore((state) => state.picks.size === state.events.length);

export const useNextRevealablePick = () =>
  useCurrentPackStore((state) => {
    const { revealQueue, currentRevealIndex } = state;
    if (currentRevealIndex >= revealQueue.length) return null;

    const pick = revealQueue[currentRevealIndex];
    if (!pick || !pick.is_resolved || pick.reveal_animation_played) return null;

    return pick;
  });

export const useIsPackFullyResolved = () =>
  useCurrentPackStore((state) =>
    state.revealQueue.length > 0 &&
    state.revealQueue.every((p) => p.reveal_animation_played)
  );
