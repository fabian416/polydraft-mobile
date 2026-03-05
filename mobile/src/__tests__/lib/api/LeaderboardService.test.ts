/**
 * LeaderboardService Tests
 */

import { supabase } from '../../../lib/supabase/client';
import {
  getLeaderboard,
  getOrCreateWeeklyLeaderboard,
  updateLeaderboardEntry,
} from '../../../lib/api/LeaderboardService';

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

function resetMocks() {
  (supabase.from as jest.Mock).mockReset();
}

// ============================================
// Tests
// ============================================

describe('LeaderboardService', () => {
  beforeEach(() => {
    resetMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // getLeaderboard
  // ------------------------------------------
  describe('getLeaderboard', () => {
    it('returns empty when no stats', async () => {
      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getLeaderboard();
      expect(result.entries).toEqual([]);
      expect(result.totalPlayers).toBe(0);
    });

    it('returns ranked entries sorted by points', async () => {
      const weeklyStats = [
        {
          profile_id: 'p1',
          total_points: 100,
          correct_picks: 4,
          user_profiles: { id: 'p1', display_name: 'Alice', anonymous_id: 'anon-1' },
        },
        {
          profile_id: 'p2',
          total_points: 200,
          correct_picks: 5,
          user_profiles: { id: 'p2', display_name: 'Bob', anonymous_id: 'anon-2' },
        },
      ];

      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ data: weeklyStats, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getLeaderboard(10, 0);

      expect(result.totalPlayers).toBe(2);
      expect(result.entries[0].displayName).toBe('Bob');
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[0].totalPoints).toBe(200);
      expect(result.entries[1].displayName).toBe('Alice');
      expect(result.entries[1].rank).toBe(2);
    });

    it('aggregates multiple packs per profile', async () => {
      const weeklyStats = [
        {
          profile_id: 'p1',
          total_points: 50,
          correct_picks: 3,
          user_profiles: { id: 'p1', display_name: 'Alice', anonymous_id: 'anon-1' },
        },
        {
          profile_id: 'p1',
          total_points: 75,
          correct_picks: 4,
          user_profiles: { id: 'p1', display_name: 'Alice', anonymous_id: 'anon-1' },
        },
      ];

      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ data: weeklyStats, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getLeaderboard();

      expect(result.totalPlayers).toBe(1);
      expect(result.entries[0].totalPoints).toBe(125);
      expect(result.entries[0].packsOpened).toBe(2);
    });

    it('correctly identifies current user', async () => {
      const weeklyStats = [
        {
          profile_id: 'p1',
          total_points: 100,
          correct_picks: 4,
          user_profiles: { id: 'p1', display_name: 'Alice', anonymous_id: 'anon-1' },
        },
      ];

      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ data: weeklyStats, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getLeaderboard(10, 0, 'anon-1');

      expect(result.entries[0].isCurrentUser).toBe(true);
      expect(result.userRank).toBe(1);
      expect(result.userPoints).toBe(100);
    });

    it('respects pagination (offset + limit)', async () => {
      const weeklyStats = Array.from({ length: 5 }, (_, i) => ({
        profile_id: `p${i}`,
        total_points: (5 - i) * 100,
        correct_picks: 3,
        user_profiles: { id: `p${i}`, display_name: `User${i}`, anonymous_id: `anon-${i}` },
      }));

      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ data: weeklyStats, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getLeaderboard(2, 1);

      expect(result.entries.length).toBe(2);
      expect(result.entries[0].rank).toBe(2);
      expect(result.totalPlayers).toBe(5);
    });

    it('returns empty on supabase error', async () => {
      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'ERR', message: 'db error' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getLeaderboard();
      expect(result).toEqual({ entries: [], totalPlayers: 0 });
    });

    it('calculates accuracy correctly', async () => {
      const weeklyStats = [
        {
          profile_id: 'p1',
          total_points: 100,
          correct_picks: 3,
          user_profiles: { id: 'p1', display_name: 'Alice', anonymous_id: 'anon-1' },
        },
      ];

      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ data: weeklyStats, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getLeaderboard();
      // 1 pack = 5 total picks, 3 correct -> accuracy = 3/5 = 0.6
      expect(result.entries[0].accuracy).toBe(0.6);
    });
  });

  // ------------------------------------------
  // getOrCreateWeeklyLeaderboard
  // ------------------------------------------
  describe('getOrCreateWeeklyLeaderboard', () => {
    it('returns existing leaderboard ID', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: { id: 'lb-1' }, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getOrCreateWeeklyLeaderboard();
      expect(result).toBe('lb-1');
    });

    it('creates new leaderboard when none exists', async () => {
      // First call: select existing -> not found
      const selectChain = mockChain();
      selectChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Second call: insert new
      const insertChain = mockChain();
      const innerSingle = jest.fn().mockResolvedValue({
        data: { id: 'lb-new' },
        error: null,
      });
      const innerSelect = jest.fn().mockReturnValue({ single: innerSingle });
      insertChain.insert = jest.fn().mockReturnValue({ select: innerSelect });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const result = await getOrCreateWeeklyLeaderboard();
      expect(result).toBe('lb-new');
    });
  });

  // ------------------------------------------
  // updateLeaderboardEntry
  // ------------------------------------------
  describe('updateLeaderboardEntry', () => {
    it('updates existing entry', async () => {
      // getOrCreateWeeklyLeaderboard
      const lbChain = mockChain();
      lbChain.single.mockResolvedValue({ data: { id: 'lb-1' }, error: null });

      // select existing entry
      const entryChain = mockChain();
      entryChain.single.mockResolvedValue({
        data: {
          id: 'entry-1',
          total_points: 100,
          packs_opened: 2,
          correct_picks: 8,
          picks_made: 10,
        },
        error: null,
      });

      // update call
      const updateChain = mockChain();
      updateChain.eq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(lbChain)    // getOrCreateWeeklyLeaderboard
        .mockReturnValueOnce(entryChain) // select existing entry
        .mockReturnValueOnce(updateChain); // update

      const result = await updateLeaderboardEntry('p1', 50, 1, 3, 5);
      expect(result).toBe(true);
    });

    it('creates new entry when none exists', async () => {
      const lbChain = mockChain();
      lbChain.single.mockResolvedValue({ data: { id: 'lb-1' }, error: null });

      const selectChain = mockChain();
      selectChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const insertChain = mockChain();
      insertChain.insert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(lbChain)
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const result = await updateLeaderboardEntry('p1', 50);
      expect(result).toBe(true);
    });
  });
});
