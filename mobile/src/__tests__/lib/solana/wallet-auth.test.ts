import { PublicKey } from '@solana/web3.js';
import {
  authenticateWithWallet,
  buildAuthMessage,
} from '../../../lib/solana/wallet-auth';
import { AUTH_MESSAGE_PREFIX } from '../../../lib/solana/constants';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('solana/wallet-auth', () => {
  const mockPublicKey = new PublicKey('WalletAuthTestPublicKey1234567890');
  const mockSignMessage = jest.fn();
  const mockNonce = 'test-nonce-abc123';
  const mockToken = 'jwt-token-xyz';
  const mockProfileId = 'profile-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignMessage.mockResolvedValue(new Uint8Array(64).fill(7));
  });

  function mockFetchResponses() {
    mockFetch
      // First call: fetchNonce
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: mockNonce }),
      })
      // Second call: verifySignature
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, profileId: mockProfileId }),
      });
  }

  describe('buildAuthMessage', () => {
    it('returns a Uint8Array', () => {
      const msg = buildAuthMessage('some-nonce');
      expect(msg).toBeInstanceOf(Uint8Array);
    });

    it('encodes the prefix + nonce', () => {
      const nonce = 'test-nonce';
      const msg = buildAuthMessage(nonce);
      const decoded = new TextDecoder().decode(msg);
      expect(decoded).toBe(`${AUTH_MESSAGE_PREFIX}${nonce}`);
    });

    it('includes the Polydraft prefix', () => {
      const msg = buildAuthMessage('xyz');
      const decoded = new TextDecoder().decode(msg);
      expect(decoded).toContain('Polydraft');
      expect(decoded).toContain('Nonce:');
    });
  });

  describe('authenticateWithWallet', () => {
    it('returns token, profileId, and walletAddress on success', async () => {
      mockFetchResponses();

      const result = await authenticateWithWallet(mockPublicKey, mockSignMessage);

      expect(result).toEqual({
        token: mockToken,
        profileId: mockProfileId,
        walletAddress: mockPublicKey.toBase58(),
      });
    });

    it('fetches a nonce from the API as the first step', async () => {
      mockFetchResponses();

      await authenticateWithWallet(mockPublicKey, mockSignMessage);

      const firstCall = mockFetch.mock.calls[0];
      expect(firstCall[0]).toContain('/api/auth/nonce');
      expect(firstCall[0]).toContain(encodeURIComponent(mockPublicKey.toBase58()));
    });

    it('calls signMessage with the auth message bytes', async () => {
      mockFetchResponses();

      await authenticateWithWallet(mockPublicKey, mockSignMessage);

      expect(mockSignMessage).toHaveBeenCalledTimes(1);
      const signedMessage = mockSignMessage.mock.calls[0][0];
      expect(signedMessage).toBeInstanceOf(Uint8Array);

      const decoded = new TextDecoder().decode(signedMessage);
      expect(decoded).toContain(mockNonce);
    });

    it('sends the signature to the verify endpoint', async () => {
      mockFetchResponses();

      await authenticateWithWallet(mockPublicKey, mockSignMessage);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const verifyCall = mockFetch.mock.calls[1];
      expect(verifyCall[0]).toContain('/api/auth/verify');
      expect(verifyCall[1].method).toBe('POST');
      expect(verifyCall[1].headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(verifyCall[1].body);
      expect(body).toHaveProperty('address', mockPublicKey.toBase58());
      expect(body).toHaveProperty('signature');
      expect(body).toHaveProperty('nonce', mockNonce);
    });

    it('throws when nonce fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limited' }),
      });

      await expect(
        authenticateWithWallet(mockPublicKey, mockSignMessage)
      ).rejects.toThrow('Rate limited');
    });

    it('throws when nonce fetch fails with no error body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error('parse error'); },
      });

      await expect(
        authenticateWithWallet(mockPublicKey, mockSignMessage)
      ).rejects.toThrow('Failed to get nonce');
    });

    it('throws when verify endpoint fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ nonce: mockNonce }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Invalid signature' }),
        });

      await expect(
        authenticateWithWallet(mockPublicKey, mockSignMessage)
      ).rejects.toThrow('Invalid signature');
    });

    it('throws when signMessage rejects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: mockNonce }),
      });
      mockSignMessage.mockRejectedValueOnce(new Error('User rejected'));

      await expect(
        authenticateWithWallet(mockPublicKey, mockSignMessage)
      ).rejects.toThrow('User rejected');
    });
  });
});
