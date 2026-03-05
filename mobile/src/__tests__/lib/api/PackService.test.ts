/**
 * PackService Tests
 */

import { supabase } from '../../../lib/supabase/client';
import {
  createPack,
  createPicks,
  createPackWithPicks,
  getPackById,
  getPacksByProfileId,
  packExists,
  updatePackResolution,
  markPickRevealed,
  countWeeklyPacks,
  getWeeklyPackStatus,
  checkAvailability,
  getPacksForUser,
  WEEKLY_PACK_LIMIT,
} from '../../../lib/api/PackService';
import type { CreatePackInput, CreatePickInput } from '../../../lib/api/PackService';

// ============================================
// Test Helpers
// ============================================

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, jest.Mock> = {};
  const resolvedValue = overrides._resolve ?? { data: null, error: null };

  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'in', 'gte', 'lte', 'order',
  ];

  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }

  chain.single = jest.fn().mockResolvedValue(resolvedValue);

  // Allow terminal override for non-single calls
  if (overrides._resolveInsert) {
    chain.insert = jest.fn().mockReturnValue({
      ...chain,
      select: jest.fn().mockReturnValue({
        ...chain,
        single: jest.fn().mockResolvedValue(overrides._resolveInsert),
      }),
    });
  }

  if (overrides._resolveSelect) {
    chain.select = jest.fn().mockReturnValue({
      ...chain,
      eq: jest.fn().mockReturnValue({
        ...chain,
        single: jest.fn().mockResolvedValue(overrides._resolveSelect),
        order: jest.fn().mockResolvedValue(overrides._resolveSelect),
      }),
      in: jest.fn().mockReturnValue({
        ...chain,
        order: jest.fn().mockResolvedValue(overrides._resolveSelect),
      }),
    });
  }

  return chain;
}

function resetSupabaseMock() {
  (supabase.from as jest.Mock).mockReset();
  (supabase.rpc as jest.Mock).mockReset();
}

// ============================================
// Tests
// ============================================

describe('PackService', () => {
  beforeEach(() => {
    resetSupabaseMock();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // packExists
  // ------------------------------------------
  describe('packExists', () => {
    it('returns true when pack is found', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: { id: 'pack-1' }, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await packExists('pack-1');

      expect(supabase.from).toHaveBeenCalledWith('user_packs');
      expect(chain.select).toHaveBeenCalledWith('id');
      expect(chain.eq).toHaveBeenCalledWith('id', 'pack-1');
      expect(result).toBe(true);
    });

    it('returns false when pack not found (PGRST116)', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await packExists('nonexistent');
      expect(result).toBe(false);
    });

    it('returns false on other errors', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN', message: 'db error' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await packExists('pack-err');
      expect(result).toBe(false);
    });
  });

  // ------------------------------------------
  // createPack
  // ------------------------------------------
  describe('createPack', () => {
    const input: CreatePackInput = {
      id: 'pack-new',
      profileId: 'profile-1',
      packTypeSlug: 'daily',
      openedAt: '2025-01-01T00:00:00Z',
    };

    it('returns error if pack type not found', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await createPack(input);
      expect(result).toEqual({ error: 'Pack type not found for slug: daily' });
    });

    it('creates pack successfully', async () => {
      // First call: getPackTypeBySlug -> pack_types
      const packTypeChain = mockChain();
      packTypeChain.single.mockResolvedValue({ data: { id: 'pt-1' }, error: null });

      // Second call: insert into user_packs
      const insertChain = mockChain();
      const innerSingle = jest.fn().mockResolvedValue({ data: { id: 'pack-new' }, error: null });
      const innerSelect = jest.fn().mockReturnValue({ single: innerSingle });
      insertChain.insert = jest.fn().mockReturnValue({ select: innerSelect });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(packTypeChain) // pack_types
        .mockReturnValueOnce(insertChain);  // user_packs

      const result = await createPack(input);
      expect(result).toEqual({ id: 'pack-new' });
    });

    it('includes premium fields when isPremium is true', async () => {
      const premiumInput: CreatePackInput = {
        ...input,
        isPremium: true,
        paymentSignature: 'sig-123',
        paymentAmount: 5.0,
        buyerWallet: 'wallet-123',
      };

      const packTypeChain = mockChain();
      packTypeChain.single.mockResolvedValue({ data: { id: 'pt-1' }, error: null });

      const insertChain = mockChain();
      const innerSingle = jest.fn().mockResolvedValue({ data: { id: 'pack-new' }, error: null });
      const innerSelect = jest.fn().mockReturnValue({ single: innerSingle });
      insertChain.insert = jest.fn().mockReturnValue({ select: innerSelect });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(packTypeChain)
        .mockReturnValueOnce(insertChain);

      await createPack(premiumInput);

      const insertCall = insertChain.insert.mock.calls[0][0];
      expect(insertCall.is_premium).toBe(true);
      expect(insertCall.payment_signature).toBe('sig-123');
      expect(insertCall.payment_amount).toBe(5.0);
      expect(insertCall.buyer_wallet).toBe('wallet-123');
    });

    it('returns error on supabase insert failure', async () => {
      const packTypeChain = mockChain();
      packTypeChain.single.mockResolvedValue({ data: { id: 'pt-1' }, error: null });

      const insertChain = mockChain();
      const innerSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate', details: 'key conflict' },
      });
      const innerSelect = jest.fn().mockReturnValue({ single: innerSingle });
      insertChain.insert = jest.fn().mockReturnValue({ select: innerSelect });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(packTypeChain)
        .mockReturnValueOnce(insertChain);

      const result = await createPack(input);
      expect(result).toHaveProperty('error');
      expect((result as { error: string }).error).toContain('23505');
    });
  });

  // ------------------------------------------
  // createPicks
  // ------------------------------------------
  describe('createPicks', () => {
    const picks: CreatePickInput[] = [
      {
        id: 'pick-1',
        userPackId: 'pack-1',
        eventId: 'evt-1',
        position: 0,
        pickedOutcome: 'a',
        pickedAt: '2025-01-01T00:00:00Z',
        probabilitySnapshot: 0.65,
        oppositeProbabilitySnapshot: 0.35,
      },
    ];

    it('inserts picks successfully', async () => {
      const chain = mockChain();
      chain.insert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await createPicks(picks);
      expect(result).toEqual({ success: true });
      expect(supabase.from).toHaveBeenCalledWith('user_picks');
    });

    it('returns error on insert failure', async () => {
      const chain = mockChain();
      chain.insert = jest.fn().mockResolvedValue({
        error: { code: 'ERR', message: 'insert fail', details: 'test' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await createPicks(picks);
      expect(result).toHaveProperty('error');
    });
  });

  // ------------------------------------------
  // createPackWithPicks
  // ------------------------------------------
  describe('createPackWithPicks', () => {
    const packInput: CreatePackInput = {
      id: 'pack-combo',
      profileId: 'profile-1',
      packTypeSlug: 'daily',
      openedAt: '2025-01-01T00:00:00Z',
    };

    const picksInput = [
      {
        id: 'pick-1',
        eventId: 'evt-1',
        position: 0,
        pickedOutcome: 'a' as const,
        pickedAt: '2025-01-01T00:00:00Z',
        probabilitySnapshot: 0.6,
        oppositeProbabilitySnapshot: 0.4,
      },
    ];

    it('creates pack and picks, returns packId', async () => {
      // pack_types lookup
      const ptChain = mockChain();
      ptChain.single.mockResolvedValue({ data: { id: 'pt-1' }, error: null });

      // user_packs insert
      const packChain = mockChain();
      const packSingle = jest.fn().mockResolvedValue({ data: { id: 'pack-combo' }, error: null });
      const packSelect = jest.fn().mockReturnValue({ single: packSingle });
      packChain.insert = jest.fn().mockReturnValue({ select: packSelect });

      // user_picks insert
      const picksChain = mockChain();
      picksChain.insert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(ptChain)    // getPackTypeBySlug
        .mockReturnValueOnce(packChain)  // createPack insert
        .mockReturnValueOnce(picksChain); // createPicks insert

      const result = await createPackWithPicks(packInput, picksInput);
      expect(result).toEqual({ packId: 'pack-combo' });
    });

    it('returns error when createPack fails', async () => {
      const ptChain = mockChain();
      ptChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue(ptChain);

      const result = await createPackWithPicks(packInput, picksInput);
      expect(result).toHaveProperty('error');
      expect((result as { error: string }).error).toContain('createPack failed');
    });
  });

  // ------------------------------------------
  // getPackById
  // ------------------------------------------
  describe('getPackById', () => {
    it('returns pack data on success', async () => {
      const mockPack = { id: 'pack-1', picks: [] };
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: mockPack, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getPackById('pack-1');
      expect(result).toEqual(mockPack);
      expect(chain.select).toHaveBeenCalledWith('*, picks:user_picks(*)');
    });

    it('returns null on error', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: 'ERR', message: 'failed' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getPackById('bad-id');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------
  // getPacksByProfileId
  // ------------------------------------------
  describe('getPacksByProfileId', () => {
    it('returns array of packs', async () => {
      const mockPacks = [{ id: 'p1' }, { id: 'p2' }];
      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({ data: mockPacks, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getPacksByProfileId('profile-1');
      expect(result).toEqual(mockPacks);
    });

    it('returns empty array on error', async () => {
      const chain = mockChain();
      chain.order = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'ERR', message: 'fail' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getPacksByProfileId('bad-profile');
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------
  // updatePackResolution
  // ------------------------------------------
  describe('updatePackResolution', () => {
    it('updates resolution status and returns true', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await updatePackResolution('pack-1', 'fully_resolved', 100, 4);
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('user_packs');
    });

    it('returns false on error', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({
        error: { code: 'ERR', message: 'fail' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await updatePackResolution('pack-1', 'pending');
      expect(result).toBe(false);
    });
  });

  // ------------------------------------------
  // markPickRevealed
  // ------------------------------------------
  describe('markPickRevealed', () => {
    it('marks pick and returns true', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await markPickRevealed('pick-1');
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('user_picks');
    });

    it('returns false on error', async () => {
      const chain = mockChain();
      chain.eq = jest.fn().mockResolvedValue({
        error: { code: 'ERR', message: 'fail' },
      });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await markPickRevealed('bad-pick');
      expect(result).toBe(false);
    });
  });

  // ------------------------------------------
  // countWeeklyPacks
  // ------------------------------------------
  describe('countWeeklyPacks', () => {
    it('returns the pack count', async () => {
      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ count: 1, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await countWeeklyPacks('profile-1');
      expect(result).toBe(1);
      expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('returns 0 on error', async () => {
      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ count: null, error: { code: 'ERR' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await countWeeklyPacks('bad-profile');
      expect(result).toBe(0);
    });
  });

  // ------------------------------------------
  // getWeeklyPackStatus
  // ------------------------------------------
  describe('getWeeklyPackStatus', () => {
    it('returns correct status when user has opened 1 pack', async () => {
      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ count: 1, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const status = await getWeeklyPackStatus('profile-1');
      expect(status.packsOpenedThisWeek).toBe(1);
      expect(status.packsRemaining).toBe(WEEKLY_PACK_LIMIT - 1);
      expect(status.canOpenPack).toBe(true);
      expect(status.weeklyLimit).toBe(WEEKLY_PACK_LIMIT);
    });

    it('returns canOpenPack false when limit reached', async () => {
      const chain = mockChain();
      chain.lte = jest.fn().mockResolvedValue({ count: WEEKLY_PACK_LIMIT, error: null });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const status = await getWeeklyPackStatus('profile-1');
      expect(status.packsRemaining).toBe(0);
      expect(status.canOpenPack).toBe(false);
    });
  });

  // ------------------------------------------
  // checkAvailability
  // ------------------------------------------
  describe('checkAvailability', () => {
    it('returns full availability when no profile exists', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const status = await checkAvailability('anon-new');
      expect(status.packsOpenedThisWeek).toBe(0);
      expect(status.packsRemaining).toBe(WEEKLY_PACK_LIMIT);
      expect(status.canOpenPack).toBe(true);
    });

    it('returns weekly status when profile exists', async () => {
      // First call: user_profiles lookup
      const profileChain = mockChain();
      profileChain.single.mockResolvedValue({ data: { id: 'prof-1' }, error: null });

      // Second call: countWeeklyPacks
      const countChain = mockChain();
      countChain.lte = jest.fn().mockResolvedValue({ count: 1, error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(countChain);

      const status = await checkAvailability('anon-existing');
      expect(status.packsOpenedThisWeek).toBe(1);
      expect(status.canOpenPack).toBe(true);
    });
  });

  // ------------------------------------------
  // getPacksForUser
  // ------------------------------------------
  describe('getPacksForUser', () => {
    it('returns empty when no profile', async () => {
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getPacksForUser('anon-new');
      expect(result.packs).toEqual([]);
      expect(result.weeklyStatus.canOpenPack).toBe(true);
    });
  });
});
