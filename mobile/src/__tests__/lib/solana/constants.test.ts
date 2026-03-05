import {
  PROGRAM_ID,
  USDC_MINT,
  TREASURY_PUBKEY,
  RPC_URL,
  PREMIUM_PACK_PRICE,
  PLAY_MINT,
  PLAY_DECIMALS,
  AUTH_MESSAGE_PREFIX,
} from '../../../lib/solana/constants';

describe('solana/constants', () => {
  describe('PROGRAM_ID', () => {
    it('is a valid PublicKey instance', () => {
      expect(PROGRAM_ID).toBeDefined();
      expect(typeof PROGRAM_ID.toBase58()).toBe('string');
    });

    it('has a toBuffer method returning 32 bytes', () => {
      const buf = PROGRAM_ID.toBuffer();
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(32);
    });
  });

  describe('USDC_MINT', () => {
    it('is a valid PublicKey instance', () => {
      expect(USDC_MINT).toBeDefined();
      expect(typeof USDC_MINT.toBase58()).toBe('string');
    });
  });

  describe('TREASURY_PUBKEY', () => {
    it('is a valid PublicKey instance', () => {
      expect(TREASURY_PUBKEY).toBeDefined();
      expect(typeof TREASURY_PUBKEY.toBase58()).toBe('string');
    });
  });

  describe('PLAY_MINT', () => {
    it('is a valid PublicKey instance', () => {
      expect(PLAY_MINT).toBeDefined();
      expect(typeof PLAY_MINT.toBase58()).toBe('string');
    });
  });

  describe('RPC_URL', () => {
    it('is a valid URL string', () => {
      expect(typeof RPC_URL).toBe('string');
      expect(RPC_URL.startsWith('https://')).toBe(true);
    });

    it('defaults to devnet', () => {
      expect(RPC_URL).toContain('devnet');
    });
  });

  describe('PREMIUM_PACK_PRICE', () => {
    it('is 100 USDC in 6-decimal format', () => {
      expect(PREMIUM_PACK_PRICE).toBe(100_000_000);
    });

    it('is a number', () => {
      expect(typeof PREMIUM_PACK_PRICE).toBe('number');
    });
  });

  describe('PLAY_DECIMALS', () => {
    it('is 6', () => {
      expect(PLAY_DECIMALS).toBe(6);
    });
  });

  describe('AUTH_MESSAGE_PREFIX', () => {
    it('contains the nonce placeholder text', () => {
      expect(AUTH_MESSAGE_PREFIX).toContain('Nonce:');
    });

    it('contains the app name', () => {
      expect(AUTH_MESSAGE_PREFIX).toContain('Polydraft');
    });

    it('is a string', () => {
      expect(typeof AUTH_MESSAGE_PREFIX).toBe('string');
    });
  });
});
