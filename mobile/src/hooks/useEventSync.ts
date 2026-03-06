import { useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useMyPacksStore } from '../stores/myPacks';
import { calculatePoints } from '../lib/scoring/calculator';
import type { Outcome } from '../types';

/**
 * Global hook that subscribes to Supabase realtime changes on the `events` table.
 * When an event gets resolved (winning_outcome set), it finds all local picks
 * referencing that event and updates them with the correct score.
 *
 * Mount this once at the top-level navigator so it runs for the lifetime of the app.
 */
export function useEventSync() {
  const packs = useMyPacksStore((s) => s.packs);
  const resolvePicksForEvent = useMyPacksStore((s) => s.resolvePicksForEvent);

  useEffect(() => {
    const channel = supabase
      .channel('event-resolution')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: 'winning_outcome=neq.null',
        },
        (payload) => {
          const event = payload.new as {
            id: string;
            winning_outcome: Outcome | null;
            resolved_at: string | null;
          };

          if (!event.winning_outcome) return;

          // Read latest state directly to avoid stale closure
          const currentPacks = useMyPacksStore.getState().packs;

          for (const [packId, storedPack] of Object.entries(currentPacks)) {
            for (const pick of storedPack.picks) {
              if (pick.event_id === event.id && !pick.is_resolved) {
                const isCorrect = pick.picked_outcome === event.winning_outcome;
                const scoring = calculatePoints({
                  probabilityAtPick: pick.probability_snapshot,
                  isCorrect,
                });

                resolvePicksForEvent(packId, event.id, {
                  winningOutcome: event.winning_outcome,
                  resolvedAt: event.resolved_at || new Date().toISOString(),
                  isCorrect,
                  pointsAwarded: scoring.points,
                });

                // resolvePicksForEvent handles all picks for this event in the pack,
                // so break out of the inner loop to avoid duplicate calls.
                break;
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [packs, resolvePicksForEvent]);
}
