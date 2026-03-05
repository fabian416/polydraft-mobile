import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserPack, UserPick, Event } from '../types';

// ============================================
// Types
// ============================================

export interface StoredPack {
  pack: UserPack;
  picks: (UserPick & { event: Event })[];
  events: Event[];
  syncedToDb: boolean;
}

export interface PickPreview {
  eventId: string;
  pickedOutcome: 'a' | 'b' | 'draw';
  pickedLabel: string;
  isResolved: boolean;
  isRevealed: boolean;
  isCorrect: boolean | null;
}

export type PackStatus = 'drafting' | 'waiting' | 'has_reveals' | 'completed';

export interface PackSummary {
  id: string;
  packTypeSlug: string;
  openedAt: string;
  totalPicks: number;
  resolvedCount: number;
  revealedCount: number;
  totalPoints: number;
  pickPreviews: PickPreview[];
  status: PackStatus;
  isPremium: boolean;
}

// ============================================
// Store Interface
// ============================================

interface ResolvePickData {
  winningOutcome: 'a' | 'b' | 'draw';
  resolvedAt: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

interface MyPacksState {
  // State
  packs: Record<string, StoredPack>;
  packOrder: string[];

  // Actions
  addPack: (pack: UserPack, events: Event[], picks: (UserPick & { event: Event })[]) => void;
  updatePack: (packId: string, updates: Partial<UserPack>) => void;
  updatePick: (packId: string, pickId: string, updates: Partial<UserPick>) => void;
  removePack: (packId: string) => void;
  resolvePicksForEvent: (packId: string, eventId: string, data: ResolvePickData) => void;
  markPackSynced: (packId: string) => void;
  getUnsyncedPacks: () => StoredPack[];

  // Selectors
  getPackById: (packId: string) => StoredPack | null;
  getPackSummaries: () => PackSummary[];
  getTotalPendingReveals: () => number;
  getActivePacksCount: () => number;
}

// ============================================
// Helper Functions
// ============================================

function computePackStatus(picks: (UserPick & { event: Event })[]): PackStatus {
  if (picks.length === 0) return 'drafting';

  const allRevealed = picks.every((p) => p.reveal_animation_played);
  if (allRevealed) return 'completed';

  const hasUnrevealedResolved = picks.some(
    (p) => p.is_resolved && !p.reveal_animation_played
  );
  if (hasUnrevealedResolved) return 'has_reveals';

  return 'waiting';
}

function computePickPreview(pick: UserPick & { event: Event }): PickPreview {
  const event = pick.event;
  const pickedLabel =
    pick.picked_outcome === 'a'
      ? event.outcome_a_label
      : pick.picked_outcome === 'b'
        ? event.outcome_b_label
        : event.outcome_draw_label || 'Draw';

  return {
    eventId: pick.event_id,
    pickedOutcome: pick.picked_outcome,
    pickedLabel,
    isResolved: pick.is_resolved,
    isRevealed: pick.reveal_animation_played,
    isCorrect: pick.is_resolved ? (pick.is_correct ?? null) : null,
  };
}

function computePackSummary(storedPack: StoredPack): PackSummary {
  const { pack, picks } = storedPack;

  const resolvedCount = picks.filter((p) => p.is_resolved).length;
  const revealedCount = picks.filter((p) => p.reveal_animation_played).length;
  const totalPoints = picks.reduce((sum, p) => sum + (p.points_awarded || 0), 0);

  return {
    id: pack.id,
    packTypeSlug: pack.pack_type?.slug ?? 'sports',
    openedAt: pack.opened_at,
    totalPicks: picks.length,
    resolvedCount,
    revealedCount,
    totalPoints,
    pickPreviews: picks
      .sort((a, b) => a.position - b.position)
      .map(computePickPreview),
    status: computePackStatus(picks),
    isPremium: !!pack.is_premium,
  };
}

// ============================================
// Store
// ============================================

export const useMyPacksStore = create<MyPacksState>()(
  persist(
    (set, get) => ({
      // Initial state
      packs: {},
      packOrder: [],

      // Add a new pack
      addPack: (pack, events, picks) => {
        const { packs, packOrder } = get();

        if (packs[pack.id]) {
          return;
        }

        set({
          packs: {
            ...packs,
            [pack.id]: { pack, events, picks, syncedToDb: false },
          },
          packOrder: [pack.id, ...packOrder],
        });
      },

      // Update pack metadata
      updatePack: (packId, updates) => {
        const { packs } = get();
        const storedPack = packs[packId];

        if (!storedPack) return;

        set({
          packs: {
            ...packs,
            [packId]: {
              ...storedPack,
              pack: { ...storedPack.pack, ...updates },
            },
          },
        });
      },

      // Update a specific pick
      updatePick: (packId, pickId, updates) => {
        const { packs } = get();
        const storedPack = packs[packId];

        if (!storedPack) return;

        const newPicks = storedPack.picks.map((pick) =>
          pick.id === pickId ? { ...pick, ...updates } : pick
        );

        const totalPoints = newPicks.reduce(
          (sum, p) => sum + (p.points_awarded || 0),
          0
        );
        const correctPicks = newPicks.filter((p) => p.is_correct).length;
        const allRevealed = newPicks.every((p) => p.reveal_animation_played);

        set({
          packs: {
            ...packs,
            [packId]: {
              ...storedPack,
              picks: newPicks,
              pack: {
                ...storedPack.pack,
                total_points: totalPoints,
                correct_picks: correctPicks,
                resolution_status: allRevealed ? 'fully_resolved' : storedPack.pack.resolution_status,
                fully_resolved_at: allRevealed ? new Date().toISOString() : storedPack.pack.fully_resolved_at,
              },
            },
          },
        });
      },

      // Remove a pack
      removePack: (packId) => {
        const { packs, packOrder } = get();
        const newPacks = { ...packs };
        delete newPacks[packId];

        set({
          packs: newPacks,
          packOrder: packOrder.filter((id) => id !== packId),
        });
      },

      // Resolve picks for a specific event
      resolvePicksForEvent: (packId, eventId, data) => {
        const { packs } = get();
        const storedPack = packs[packId];

        if (!storedPack) return;

        const newPicks = storedPack.picks.map((pick) => {
          if (pick.event_id === eventId && !pick.is_resolved) {
            return {
              ...pick,
              is_resolved: true,
              is_correct: data.isCorrect,
              resolved_at: data.resolvedAt,
              points_awarded: data.pointsAwarded,
              event: {
                ...pick.event,
                status: 'resolved' as const,
                winning_outcome: data.winningOutcome,
                resolved_at: data.resolvedAt,
              },
            };
          }
          return pick;
        });

        const totalPoints = newPicks.reduce(
          (sum, p) => sum + (p.points_awarded || 0),
          0
        );
        const correctPicks = newPicks.filter((p) => p.is_correct).length;
        const allResolved = newPicks.every((p) => p.is_resolved);

        set({
          packs: {
            ...packs,
            [packId]: {
              ...storedPack,
              picks: newPicks,
              pack: {
                ...storedPack.pack,
                total_points: totalPoints,
                correct_picks: correctPicks,
                resolution_status: allResolved ? 'fully_resolved' : 'partially_resolved',
              },
            },
          },
        });
      },

      // Mark a pack as synced to database
      markPackSynced: (packId) => {
        const { packs } = get();
        const storedPack = packs[packId];

        if (!storedPack) return;

        set({
          packs: {
            ...packs,
            [packId]: {
              ...storedPack,
              syncedToDb: true,
            },
          },
        });
      },

      // Get all packs that haven't been synced to database
      getUnsyncedPacks: () => {
        const { packs, packOrder } = get();
        return packOrder
          .map((id) => packs[id])
          .filter((pack): pack is StoredPack => !!pack && !pack.syncedToDb);
      },

      // Get pack by ID
      getPackById: (packId) => {
        const { packs } = get();
        return packs[packId] ?? null;
      },

      // Get summaries of all packs
      getPackSummaries: () => {
        const { packs, packOrder } = get();
        return packOrder
          .map((id) => packs[id])
          .filter((p): p is StoredPack => !!p)
          .map(computePackSummary);
      },

      // Count pending reveals across all packs
      getTotalPendingReveals: () => {
        const { packs } = get();
        return Object.values(packs).reduce((total, storedPack) => {
          const pendingReveals = storedPack.picks.filter(
            (p) => p.is_resolved && !p.reveal_animation_played
          ).length;
          return total + pendingReveals;
        }, 0);
      },

      // Count active (non-completed) packs
      getActivePacksCount: () => {
        const { packs } = get();
        return Object.values(packs).filter((storedPack) => {
          const status = computePackStatus(storedPack.picks);
          return status !== 'completed';
        }).length;
      },
    }),
    {
      name: 'polydraft-my-packs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useMyPacks = () => useMyPacksStore((state) => state.packs);
export const usePackOrder = () => useMyPacksStore((state) => state.packOrder);

export const usePackSummaries = () => {
  const packs = useMyPacksStore((state) => state.packs);
  const packOrder = useMyPacksStore((state) => state.packOrder);

  return packOrder
    .map((id) => packs[id])
    .filter((p): p is StoredPack => !!p)
    .map(computePackSummary);
};

export const useTotalPendingReveals = () => {
  const packs = useMyPacksStore((state) => state.packs);

  return Object.values(packs).reduce((total, storedPack) => {
    const pendingReveals = storedPack.picks.filter(
      (p) => p.is_resolved && !p.reveal_animation_played
    ).length;
    return total + pendingReveals;
  }, 0);
};

export const useActivePacksCount = () => {
  const packs = useMyPacksStore((state) => state.packs);

  return Object.values(packs).filter((storedPack) => {
    const status = computePackStatus(storedPack.picks);
    return status !== 'completed';
  }).length;
};

export const useStoredPack = (packId: string) => {
  return useMyPacksStore((state) => state.packs[packId] ?? null);
};

// Extended pick info for home preview
export interface ActivePickPreview {
  packId: string;
  pickId: string;
  eventTitle: string;
  category: string;
  pickedOutcome: 'a' | 'b' | 'draw';
  pickedLabel: string;
  probabilitySnapshot: number;
  isResolved: boolean;
  isRevealed: boolean;
  isCorrect: boolean | null;
}

export const useActivePickPreviews = (limit: number = 2): { picks: ActivePickPreview[]; totalCount: number } => {
  const packs = useMyPacksStore((state) => state.packs);
  const packOrder = useMyPacksStore((state) => state.packOrder);

  const allActivePicks: ActivePickPreview[] = [];

  for (const packId of packOrder) {
    const storedPack = packs[packId];
    if (!storedPack) continue;

    const status = computePackStatus(storedPack.picks);
    if (status === 'completed') continue;

    const unrevealedPicks = storedPack.picks
      .filter((p) => !p.reveal_animation_played)
      .sort((a, b) => a.position - b.position);

    for (const pick of unrevealedPicks) {
      const pickedLabel =
        pick.picked_outcome === 'a'
          ? pick.event.outcome_a_label
          : pick.picked_outcome === 'b'
            ? pick.event.outcome_b_label
            : pick.event.outcome_draw_label || 'Draw';

      allActivePicks.push({
        packId,
        pickId: pick.id,
        eventTitle: pick.event.title,
        category: pick.event.category,
        pickedOutcome: pick.picked_outcome,
        pickedLabel,
        probabilitySnapshot: pick.probability_snapshot,
        isResolved: pick.is_resolved,
        isRevealed: pick.reveal_animation_played,
        isCorrect: pick.is_resolved ? (pick.is_correct ?? null) : null,
      });
    }
  }

  return {
    picks: allActivePicks.slice(0, limit),
    totalCount: allActivePicks.length,
  };
};
