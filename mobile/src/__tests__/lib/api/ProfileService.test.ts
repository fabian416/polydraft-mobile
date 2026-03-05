/**
 * ProfileService Tests
 */

import { supabase } from '../../../lib/supabase/client';
import {
  getOrCreateProfile,
  fetchProfileById,
  fetchProfileByAnonymousId,
  updateDisplayName,
  updateProfileStats,
  incrementStreak,
  resetStreak,
  generateRandomDisplayName,
} from '../../../lib/api/ProfileService';

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
  (supabase.rpc as jest.Mock).mockReset();
}

// ============================================
// Tests
// ============================================

describe('ProfileService', () => {
  beforeEach(() => {
    resetMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // generateRandomDisplayName
  // ------------------------------------------
  describe('generateRandomDisplayName', () => {
    it('generates a name in format AdjAnimal_NNNN', () => {
      const name = generateRandomDisplayName();
      expect(name).toMatch(/^[A-Za-z]+[A-Za-z]+_\d{4}$/);
    });

    it('generates different names on successive calls', () => {
      const names = new Set(Array.from({ length: 20 }, () => generateRandomDisplayName()));
      expect(names.size).toBeGreaterThan(1);
    });
  });

  // ------------------------------------------
  // fetchProfileById
  // ------------------------------------------
  describe('fetchProfileById', () => {
    it('returns profile when found', async () => {
      const mockProfile = { id: 'p1', display_name: 'TestUser' };
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: mockProfile, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await fetchProfileById('p1');
      expect(result).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('returns null on error', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: null, error: { code: 'ERR' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await fetchProfileById('bad-id');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------
  // fetchProfileByAnonymousId
  // ------------------------------------------
  describe('fetchProfileByAnonymousId', () => {
    it('returns profile when found', async () => {
      const mockProfile = { id: 'p1', anonymous_id: 'anon-1' };
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: mockProfile, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await fetchProfileByAnonymousId('anon-1');
      expect(result).toEqual(mockProfile);
    });

    it('returns null when not found (PGRST116)', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await fetchProfileByAnonymousId('anon-missing');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------
  // updateDisplayName
  // ------------------------------------------
  describe('updateDisplayName', () => {
    it('updates display name and returns true', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await updateDisplayName('p1', 'NewName');
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('returns false on error', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({ error: { code: 'ERR' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await updateDisplayName('p1', 'BadName');
      expect(result).toBe(false);
    });
  });

  // ------------------------------------------
  // getOrCreateProfile
  // ------------------------------------------
  describe('getOrCreateProfile', () => {
    it('returns profile via RPC when it succeeds with display_name', async () => {
      const profileId = 'prof-rpc';
      const profile = { id: profileId, display_name: 'ExistingUser' };

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: profileId, error: null });

      // fetchProfileById call
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: profile, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getOrCreateProfile('anon-1');
      expect(result).toEqual({ profileId, profile });
      expect(supabase.rpc).toHaveBeenCalledWith('get_or_create_anonymous_profile', {
        p_anonymous_id: 'anon-1',
      });
    });

    it('generates display name when profile has none via RPC path', async () => {
      const profileId = 'prof-no-name';
      const profileNoName = { id: profileId, display_name: null };
      const profileWithName = { id: profileId, display_name: 'GeneratedName' };

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: profileId, error: null });

      // fetchProfileById first returns no display_name, then returns with name
      const selectChain1 = mockChain();
      selectChain1.single.mockResolvedValue({ data: profileNoName, error: null });

      const updateChain = mockChain();
      updateChain.eq = jest.fn().mockResolvedValue({ error: null });

      const selectChain2 = mockChain();
      selectChain2.single.mockResolvedValue({ data: profileWithName, error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(selectChain1)  // fetchProfileById (no name)
        .mockReturnValueOnce(updateChain)   // updateDisplayName
        .mockReturnValueOnce(selectChain2); // fetchProfileById (with name)

      const result = await getOrCreateProfile('anon-no-name');
      expect(result).not.toBeNull();
      expect(result!.profileId).toBe(profileId);
    });

    it('falls back to manual create when RPC fails', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { code: 'ERR', message: 'rpc fail' },
      });

      // Fallback: select existing -> not found
      const selectChain = mockChain();
      selectChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Insert new
      const insertChain = mockChain();
      const innerSingle = jest.fn().mockResolvedValue({
        data: { id: 'new-prof', display_name: 'Generated' },
        error: null,
      });
      const innerSelect = jest.fn().mockReturnValue({ single: innerSingle });
      insertChain.insert = jest.fn().mockReturnValue({ select: innerSelect });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(selectChain)  // fallback select
        .mockReturnValueOnce(insertChain); // insert

      const result = await getOrCreateProfile('anon-new');
      expect(result).not.toBeNull();
      expect(result!.profileId).toBe('new-prof');
    });

    it('returns null on insert failure', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { code: 'ERR' } });

      const selectChain = mockChain();
      selectChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const insertChain = mockChain();
      const innerSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'ERR', message: 'insert fail' },
      });
      const innerSelect = jest.fn().mockReturnValue({ single: innerSingle });
      insertChain.insert = jest.fn().mockReturnValue({ select: innerSelect });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const result = await getOrCreateProfile('anon-fail');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------
  // updateProfileStats
  // ------------------------------------------
  describe('updateProfileStats', () => {
    it('fetches current stats and updates them', async () => {
      const currentStats = {
        total_points: 100,
        total_packs_opened: 5,
        total_picks_made: 25,
        total_correct_picks: 15,
      };

      // First call: fetch current
      const fetchChain = mockChain();
      fetchChain.single.mockResolvedValue({ data: currentStats, error: null });

      // Second call: update
      const updateChain = mockChain();
      updateChain.eq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(fetchChain)
        .mockReturnValueOnce(updateChain);

      const result = await updateProfileStats('p1', {
        pointsToAdd: 50,
        packsToAdd: 1,
        picksToAdd: 5,
        correctPicksToAdd: 3,
      });

      expect(result).toBe(true);
    });

    it('returns false when fetch fails', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: null, error: { code: 'ERR' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await updateProfileStats('p1', {
        pointsToAdd: 0, packsToAdd: 0, picksToAdd: 0, correctPicksToAdd: 0,
      });
      expect(result).toBe(false);
    });
  });

  // ------------------------------------------
  // incrementStreak
  // ------------------------------------------
  describe('incrementStreak', () => {
    it('increments current streak and updates longest', async () => {
      const fetchChain = mockChain();
      fetchChain.single.mockResolvedValue({
        data: { current_streak: 3, longest_streak: 5 },
        error: null,
      });

      const updateChain = mockChain();
      updateChain.eq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(fetchChain)
        .mockReturnValueOnce(updateChain);

      const result = await incrementStreak('p1');
      expect(result).toBe(true);
    });

    it('updates longest_streak when current surpasses it', async () => {
      const fetchChain = mockChain();
      fetchChain.single.mockResolvedValue({
        data: { current_streak: 5, longest_streak: 5 },
        error: null,
      });

      const updateChain = mockChain();
      updateChain.eq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(fetchChain)
        .mockReturnValueOnce(updateChain);

      await incrementStreak('p1');
      // new streak = 6, longest = max(6, 5) = 6
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          current_streak: 6,
          longest_streak: 6,
        })
      );
    });
  });

  // ------------------------------------------
  // resetStreak
  // ------------------------------------------
  describe('resetStreak', () => {
    it('resets streak to 0', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await resetStreak('p1');
      expect(result).toBe(true);
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ current_streak: 0 })
      );
    });

    it('returns false on error', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({ error: { code: 'ERR' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await resetStreak('p1');
      expect(result).toBe(false);
    });
  });
});
