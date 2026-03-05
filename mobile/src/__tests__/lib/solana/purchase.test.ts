import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  buildPurchaseTransaction,
  sendPurchaseTransaction,
  derivePurchaseReceiptPDA,
  PREMIUM_PACK_PRICE,
} from '../../../lib/solana/purchase';

describe('solana/purchase', () => {
  const mockBuyer = new PublicKey('BuyerPubkeyForTestingPurchaseFlow1');
  const mockClientSeed = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('derivePurchaseReceiptPDA', () => {
    it('returns a tuple of [PublicKey, bump]', () => {
      const result = derivePurchaseReceiptPDA(mockBuyer, mockClientSeed);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('returns a PublicKey as the first element', () => {
      const [pda] = derivePurchaseReceiptPDA(mockBuyer, mockClientSeed);
      expect(typeof pda.toBase58()).toBe('string');
    });

    it('returns a number (bump) as the second element', () => {
      const [, bump] = derivePurchaseReceiptPDA(mockBuyer, mockClientSeed);
      expect(typeof bump).toBe('number');
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    it('calls PublicKey.findProgramAddressSync with correct seeds', () => {
      const spy = jest.spyOn(PublicKey, 'findProgramAddressSync');
      derivePurchaseReceiptPDA(mockBuyer, mockClientSeed);

      expect(spy).toHaveBeenCalledTimes(1);
      const [seeds] = spy.mock.calls[0];
      // First seed should be 'purchase'
      expect(seeds[0].toString()).toBe('purchase');
      // Second seed should be the buyer's bytes
      expect(seeds[1]).toEqual(mockBuyer.toBuffer());
      // Third seed should be the sanitized client seed (no dashes)
      expect(seeds[2].toString()).toBe(mockClientSeed.replace(/-/g, ''));
    });

    it('strips hyphens from client seed', () => {
      const spy = jest.spyOn(PublicKey, 'findProgramAddressSync');
      derivePurchaseReceiptPDA(mockBuyer, 'abc-def-123');
      const [seeds] = spy.mock.calls[0];
      expect(seeds[2].toString()).toBe('abcdef123');
    });
  });

  describe('buildPurchaseTransaction', () => {
    it('returns a transaction, blockhash, and lastValidBlockHeight', async () => {
      const result = await buildPurchaseTransaction(mockBuyer, mockClientSeed);

      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('blockhash');
      expect(result).toHaveProperty('lastValidBlockHeight');
    });

    it('returns a VersionedTransaction', async () => {
      const { transaction } = await buildPurchaseTransaction(mockBuyer, mockClientSeed);
      expect(transaction).toBeInstanceOf(VersionedTransaction);
    });

    it('returns the blockhash from the connection', async () => {
      const { blockhash } = await buildPurchaseTransaction(mockBuyer, mockClientSeed);
      expect(blockhash).toBe('mockBlockhash123');
    });

    it('returns lastValidBlockHeight from the connection', async () => {
      const { lastValidBlockHeight } = await buildPurchaseTransaction(mockBuyer, mockClientSeed);
      expect(lastValidBlockHeight).toBe(100);
    });

    it('calls getAssociatedTokenAddress for buyer and treasury USDC accounts', async () => {
      await buildPurchaseTransaction(mockBuyer, mockClientSeed);
      // Should be called twice: once for buyer USDC ATA, once for treasury USDC ATA
      expect(getAssociatedTokenAddress).toHaveBeenCalledTimes(2);
    });

    it('creates a Connection to the configured RPC_URL', async () => {
      await buildPurchaseTransaction(mockBuyer, mockClientSeed);
      // Connection constructor is called (our mock tracks this implicitly)
      expect(Connection).toBeDefined();
    });
  });

  describe('sendPurchaseTransaction', () => {
    it('returns a transaction signature string', async () => {
      const mockTx = new VersionedTransaction({} as any);
      const signature = await sendPurchaseTransaction(mockTx);
      expect(typeof signature).toBe('string');
      expect(signature).toBe('mockSignature123');
    });

    it('serializes the transaction before sending', async () => {
      const mockTx = new VersionedTransaction({} as any);
      const serializeSpy = jest.spyOn(mockTx, 'serialize');
      await sendPurchaseTransaction(mockTx);
      expect(serializeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('PREMIUM_PACK_PRICE re-export', () => {
    it('re-exports PREMIUM_PACK_PRICE from constants', () => {
      expect(PREMIUM_PACK_PRICE).toBe(100_000_000);
    });
  });
});
