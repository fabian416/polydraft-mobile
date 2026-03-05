import {
  getRevealStatus,
  canRevealPosition,
  getQueuedReveals,
  calculatePackTotals,
  getPackStatusMessage,
  formatRevealProgress,
} from '../../lib/resolution/sequential';
import type { UserPack, UserPick } from '../../types';

function makePick(overrides: Partial<UserPick> = {}): UserPick {
  return {
    id: 'pick-1',
    user_pack_id: 'pack-1',
    event_id: 'event-1',
    position: 1,
    picked_outcome: 'a',
    picked_at: '2026-01-01T00:00:00Z',
    probability_snapshot: 0.5,
    opposite_probability_snapshot: 0.5,
    is_resolved: false,
    is_correct: undefined,
    resolved_at: undefined,
    points_awarded: 0,
    reveal_animation_played: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePack(overrides: Partial<UserPack> = {}): UserPack {
  return {
    id: 'pack-1',
    user_id: 'user-1',
    pack_type_id: 'type-1',
    opened_at: '2026-01-01T00:00:00Z',
    resolution_status: 'pending',
    current_reveal_index: 0,
    total_points: 0,
    correct_picks: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    picks: [],
    ...overrides,
  };
}

describe('Sequential Resolution', () => {
  describe('getRevealStatus', () => {
    it('returns no reveal available when no picks are resolved', () => {
      const pack = makePack({
        picks: [
          makePick({ position: 1 }),
          makePick({ position: 2, id: 'pick-2', event_id: 'event-2' }),
        ],
      });

      const status = getRevealStatus(pack);
      expect(status.canRevealNext).toBe(false);
      expect(status.nextPick).toBeNull();
      expect(status.isFullyRevealed).toBe(false);
      expect(status.revealedCount).toBe(0);
      expect(status.resolvedCount).toBe(0);
    });

    it('allows reveal when first pick is resolved', () => {
      const pack = makePack({
        picks: [
          makePick({ position: 1, is_resolved: true, is_correct: true, points_awarded: 2 }),
          makePick({ position: 2, id: 'pick-2', event_id: 'event-2' }),
        ],
      });

      const status = getRevealStatus(pack);
      expect(status.canRevealNext).toBe(true);
      expect(status.nextRevealPosition).toBe(1);
      expect(status.nextPick).not.toBeNull();
    });

    it('blocks reveal when first pick is not resolved even if later ones are', () => {
      const pack = makePack({
        picks: [
          makePick({ position: 1 }),
          makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: true, is_correct: true }),
        ],
      });

      const status = getRevealStatus(pack);
      expect(status.canRevealNext).toBe(false);
    });

    it('returns fully revealed when all picks have been animated', () => {
      const pack = makePack({
        current_reveal_index: 2,
        picks: [
          makePick({ position: 1, is_resolved: true, reveal_animation_played: true }),
          makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: true, reveal_animation_played: true }),
        ],
      });

      const status = getRevealStatus(pack);
      expect(status.isFullyRevealed).toBe(true);
      expect(status.canRevealNext).toBe(false);
    });
  });

  describe('canRevealPosition', () => {
    it('allows revealing the next sequential position', () => {
      const pack = makePack({
        current_reveal_index: 0,
        picks: [
          makePick({ position: 1, is_resolved: true }),
        ],
      });

      expect(canRevealPosition(pack, 1)).toBe(true);
    });

    it('blocks revealing out-of-order positions', () => {
      const pack = makePack({
        current_reveal_index: 0,
        picks: [
          makePick({ position: 1 }),
          makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: true }),
        ],
      });

      expect(canRevealPosition(pack, 2)).toBe(false);
    });

    it('blocks revealing already-revealed positions', () => {
      const pack = makePack({
        current_reveal_index: 1,
        picks: [
          makePick({ position: 1, is_resolved: true, reveal_animation_played: true }),
        ],
      });

      expect(canRevealPosition(pack, 1)).toBe(false);
    });
  });

  describe('getQueuedReveals', () => {
    it('returns resolved but not yet animated picks in order', () => {
      const picks = [
        makePick({ position: 3, id: 'pick-3', event_id: 'event-3', is_resolved: true }),
        makePick({ position: 1, is_resolved: true }),
        makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: false }),
      ];
      const pack = makePack({ picks });

      const queued = getQueuedReveals(pack);
      expect(queued).toHaveLength(2);
      expect(queued[0].position).toBe(1);
      expect(queued[1].position).toBe(3);
    });

    it('excludes already animated picks', () => {
      const picks = [
        makePick({ position: 1, is_resolved: true, reveal_animation_played: true }),
        makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: true }),
      ];
      const pack = makePack({ picks });

      const queued = getQueuedReveals(pack);
      expect(queued).toHaveLength(1);
      expect(queued[0].position).toBe(2);
    });
  });

  describe('calculatePackTotals', () => {
    it('sums points and counts for resolved picks', () => {
      const picks = [
        makePick({ is_resolved: true, is_correct: true, points_awarded: 2 }),
        makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: true, is_correct: false, points_awarded: 0 }),
        makePick({ position: 3, id: 'pick-3', event_id: 'event-3', is_resolved: false }),
      ];

      const totals = calculatePackTotals(picks);
      expect(totals.totalPoints).toBe(2);
      expect(totals.correctCount).toBe(1);
      expect(totals.resolvedCount).toBe(2);
    });
  });

  describe('getPackStatusMessage', () => {
    it('shows completion message when fully revealed', () => {
      const pack = makePack({
        current_reveal_index: 2,
        picks: [
          makePick({ position: 1, is_resolved: true, is_correct: true, points_awarded: 2, reveal_animation_played: true }),
          makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: true, is_correct: false, points_awarded: 0, reveal_animation_played: true }),
        ],
      });

      expect(getPackStatusMessage(pack)).toMatch(/Pack complete!/);
    });

    it('shows ready message when next reveal is available', () => {
      const pack = makePack({
        current_reveal_index: 0,
        picks: [
          makePick({ position: 1, is_resolved: true }),
        ],
      });

      expect(getPackStatusMessage(pack)).toMatch(/Ready to reveal/);
    });

    it('shows waiting message for unresolved events', () => {
      const pack = makePack({
        current_reveal_index: 0,
        picks: [
          makePick({ position: 1 }),
        ],
      });

      expect(getPackStatusMessage(pack)).toMatch(/Waiting for event/);
    });
  });

  describe('formatRevealProgress', () => {
    it('formats progress correctly', () => {
      const pack = makePack({
        picks: [
          makePick({ position: 1, is_resolved: true, reveal_animation_played: true }),
          makePick({ position: 2, id: 'pick-2', event_id: 'event-2', is_resolved: true }),
          makePick({ position: 3, id: 'pick-3', event_id: 'event-3' }),
        ],
      });

      const progress = formatRevealProgress(pack);
      expect(progress.label).toBe('1/3');
      expect(progress.revealed).toBe(1);
      expect(progress.resolved).toBe(2);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBe(33);
    });
  });
});
