import { useCurrentPackStore } from '../../stores/currentPack';
import type { UserPack, UserPick, Event } from '../../types';

// Reset store between tests
beforeEach(() => {
  useCurrentPackStore.getState().clearPack();
});

function makeEvent(id: string): Event {
  return {
    id,
    venue: 'polymarket',
    title: `Event ${id}`,
    outcome_a_label: 'Yes',
    outcome_b_label: 'No',
    outcome_a_probability: 0.5,
    outcome_b_probability: 0.5,
    category: 'sports',
    status: 'active',
    is_featured: false,
    priority_score: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function makePack(picks: UserPick[] = []): UserPack {
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
    picks,
  };
}

function makePick(position: number): UserPick {
  return {
    id: `pick-${position}`,
    user_pack_id: 'pack-1',
    event_id: `event-${position}`,
    position,
    picked_outcome: 'a',
    picked_at: '2026-01-01T00:00:00Z',
    probability_snapshot: 0.5,
    opposite_probability_snapshot: 0.5,
    is_resolved: false,
    points_awarded: 0,
    reveal_animation_played: false,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('currentPack store', () => {
  describe('initial state', () => {
    it('starts with null pack and empty state', () => {
      const state = useCurrentPackStore.getState();
      expect(state.pack).toBeNull();
      expect(state.events).toEqual([]);
      expect(state.picks.size).toBe(0);
      expect(state.isDraftComplete).toBe(false);
      expect(state.currentDraftIndex).toBe(0);
      expect(state.isRevealing).toBe(false);
    });
  });

  describe('draft phase: idle -> draft', () => {
    it('setPack initializes draft state', () => {
      const events = [makeEvent('e1'), makeEvent('e2'), makeEvent('e3')];
      const pack = makePack();

      useCurrentPackStore.getState().setPack(pack, events);

      const state = useCurrentPackStore.getState();
      expect(state.pack).toBe(pack);
      expect(state.events).toBe(events);
      expect(state.picks.size).toBe(0);
      expect(state.isDraftComplete).toBe(false);
      expect(state.currentDraftIndex).toBe(0);
    });
  });

  describe('draft phase: making picks', () => {
    it('setDraftPick adds a pick', () => {
      const events = [makeEvent('e1'), makeEvent('e2')];
      useCurrentPackStore.getState().setPack(makePack(), events);

      useCurrentPackStore.getState().setDraftPick('e1', 'a');
      expect(useCurrentPackStore.getState().picks.get('e1')).toBe('a');
      expect(useCurrentPackStore.getState().picks.size).toBe(1);
    });

    it('setDraftPick overwrites existing pick', () => {
      const events = [makeEvent('e1')];
      useCurrentPackStore.getState().setPack(makePack(), events);

      useCurrentPackStore.getState().setDraftPick('e1', 'a');
      useCurrentPackStore.getState().setDraftPick('e1', 'b');
      expect(useCurrentPackStore.getState().picks.get('e1')).toBe('b');
      expect(useCurrentPackStore.getState().picks.size).toBe(1);
    });

    it('removeDraftPick removes a pick', () => {
      const events = [makeEvent('e1')];
      useCurrentPackStore.getState().setPack(makePack(), events);

      useCurrentPackStore.getState().setDraftPick('e1', 'a');
      useCurrentPackStore.getState().removeDraftPick('e1');
      expect(useCurrentPackStore.getState().picks.size).toBe(0);
    });

    it('advanceDraft increments currentDraftIndex', () => {
      const events = [makeEvent('e1'), makeEvent('e2'), makeEvent('e3')];
      useCurrentPackStore.getState().setPack(makePack(), events);

      useCurrentPackStore.getState().advanceDraft();
      expect(useCurrentPackStore.getState().currentDraftIndex).toBe(1);

      useCurrentPackStore.getState().advanceDraft();
      expect(useCurrentPackStore.getState().currentDraftIndex).toBe(2);
    });

    it('advanceDraft does not exceed events length', () => {
      const events = [makeEvent('e1'), makeEvent('e2')];
      useCurrentPackStore.getState().setPack(makePack(), events);

      useCurrentPackStore.getState().advanceDraft();
      useCurrentPackStore.getState().advanceDraft(); // at max
      useCurrentPackStore.getState().advanceDraft(); // should not exceed
      expect(useCurrentPackStore.getState().currentDraftIndex).toBe(1);
    });
  });

  describe('draft -> reveal transition', () => {
    it('completeDraft sets isDraftComplete and revealQueue', () => {
      const events = [makeEvent('e1'), makeEvent('e2')];
      useCurrentPackStore.getState().setPack(makePack(), events);

      const picks = [makePick(1), makePick(2)];
      useCurrentPackStore.getState().completeDraft(picks);

      const state = useCurrentPackStore.getState();
      expect(state.isDraftComplete).toBe(true);
      expect(state.revealQueue).toBe(picks);
    });
  });

  describe('reveal phase', () => {
    it('startReveal sets isRevealing to true', () => {
      useCurrentPackStore.getState().startReveal();
      expect(useCurrentPackStore.getState().isRevealing).toBe(true);
    });

    it('completeReveal sets isRevealing to false', () => {
      useCurrentPackStore.getState().startReveal();
      useCurrentPackStore.getState().completeReveal();
      expect(useCurrentPackStore.getState().isRevealing).toBe(false);
    });

    it('advanceReveal increments currentRevealIndex', () => {
      const picks = [makePick(1), makePick(2), makePick(3)];
      const pack = makePack(picks);
      useCurrentPackStore.getState().setPack(pack, []);
      useCurrentPackStore.getState().setRevealQueue(picks);

      useCurrentPackStore.getState().advanceReveal();
      expect(useCurrentPackStore.getState().currentRevealIndex).toBe(1);

      useCurrentPackStore.getState().advanceReveal();
      expect(useCurrentPackStore.getState().currentRevealIndex).toBe(2);
    });

    it('advanceReveal marks pack as fully_resolved when queue exhausted', () => {
      const picks = [makePick(1)];
      const pack = makePack(picks);
      useCurrentPackStore.getState().setPack(pack, []);
      useCurrentPackStore.getState().setRevealQueue(picks);

      useCurrentPackStore.getState().advanceReveal();
      expect(useCurrentPackStore.getState().pack?.resolution_status).toBe('fully_resolved');
    });
  });

  describe('clearPack', () => {
    it('resets all state to initial', () => {
      const events = [makeEvent('e1')];
      useCurrentPackStore.getState().setPack(makePack(), events);
      useCurrentPackStore.getState().setDraftPick('e1', 'a');
      useCurrentPackStore.getState().startReveal();

      useCurrentPackStore.getState().clearPack();

      const state = useCurrentPackStore.getState();
      expect(state.pack).toBeNull();
      expect(state.events).toEqual([]);
      expect(state.picks.size).toBe(0);
      expect(state.isDraftComplete).toBe(false);
      expect(state.isRevealing).toBe(false);
    });
  });
});
