/**
 * AuthService Tests
 */

import { supabase } from '../../../lib/supabase/client';
import { getNonce, verifySignature } from '../../../lib/api/AuthService';

// ============================================
// Mocks
// ============================================

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        API_BASE_URL: 'https://test-api.example.com',
      },
    },
  },
}));

// Mock crypto.getRandomValues
const mockRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = i % 256;
  }
  return arr;
});

Object.defineProperty(global, 'crypto', {
  value: { getRandomValues: mockRandomValues },
  writable: true,
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockChain() {
  const chain: Record<string, jest.Mock> & { then?: unknown } = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'lte', 'order'];

  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });

  // Make the chain itself thenable so `await supabase.from(...).update(...).eq(...).eq(...)` works
  chain.then = (resolve: (v: unknown) => void) => {
    resolve({ error: null });
    return Promise.resolve({ error: null });
  };

  return chain;
}

function resetMocks() {
  (supabase.from as jest.Mock).mockReset();
  mockFetch.mockReset();
}

// ============================================
// Tests
// ============================================

describe('AuthService', () => {
  beforeEach(() => {
    resetMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // getNonce
  // ------------------------------------------
  describe('getNonce', () => {
    it('returns error for empty address', async () => {
      const result = await getNonce('');
      expect(result).toEqual({ error: 'Invalid wallet address' });
    });

    it('returns error for invalid address format', async () => {
      const result = await getNonce('0x_not_valid!');
      expect(result).toEqual({ error: 'Invalid wallet address' });
    });

    it('generates and stores nonce for valid address', async () => {
      const validAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

      // Invalidate old nonces - needs .update().eq().eq() chain
      const updateChain = mockChain();

      // Insert new nonce
      const insertChain = mockChain();
      insertChain.insert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(updateChain)  // update old nonces
        .mockReturnValueOnce(insertChain); // insert new nonce

      const result = await getNonce(validAddress);

      expect('nonce' in result).toBe(true);
      if ('nonce' in result) {
        expect(result.nonce).toHaveLength(64);
        expect(result.nonce).toMatch(/^[0-9a-f]+$/);
      }
    });

    it('returns error on insert failure', async () => {
      const validAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

      // Invalidate old nonces - needs .update().eq().eq() chain
      const updateChain = mockChain();

      const insertChain = mockChain();
      insertChain.insert = jest.fn().mockResolvedValue({
        error: { code: 'ERR', message: 'insert fail' },
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(insertChain);

      const result = await getNonce(validAddress);
      expect(result).toEqual({ error: 'Failed to create nonce' });
    });

    it('invalidates old nonces before creating new one', async () => {
      const validAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

      const updateChain = mockChain();
      updateChain.eq = jest.fn().mockReturnValue(updateChain);
      // Make the final eq in the chain resolve
      let eqCallCount = 0;
      updateChain.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null });
        }
        return updateChain;
      });

      const insertChain = mockChain();
      insertChain.insert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(insertChain);

      await getNonce(validAddress);

      // Verify from was called with auth_nonces for both update and insert
      expect(supabase.from).toHaveBeenCalledWith('auth_nonces');
    });
  });

  // ------------------------------------------
  // verifySignature
  // ------------------------------------------
  describe('verifySignature', () => {
    it('returns error for missing parameters', async () => {
      const r1 = await verifySignature('', 'sig', 'nonce');
      expect(r1).toEqual({ error: 'Missing address, signature, or nonce' });

      const r2 = await verifySignature('addr', '', 'nonce');
      expect(r2).toEqual({ error: 'Missing address, signature, or nonce' });

      const r3 = await verifySignature('addr', 'sig', '');
      expect(r3).toEqual({ error: 'Missing address, signature, or nonce' });
    });

    it('returns token and profile on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            token: 'jwt-token-123',
            profileId: 'prof-1',
            address: 'wallet-addr',
          }),
      });

      const result = await verifySignature('wallet-addr', 'sig-123', 'nonce-abc');

      expect(result).toEqual({
        token: 'jwt-token-123',
        profileId: 'prof-1',
        address: 'wallet-addr',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/auth/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: 'wallet-addr',
            signature: 'sig-123',
            nonce: 'nonce-abc',
          }),
        }
      );
    });

    it('returns error on non-200 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid signature' }),
      });

      const result = await verifySignature('addr', 'sig', 'nonce');
      expect(result).toEqual({ error: 'Invalid signature' });
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network down'));

      const result = await verifySignature('addr', 'sig', 'nonce');
      expect(result).toEqual({ error: 'Network error during verification' });
    });
  });
});
