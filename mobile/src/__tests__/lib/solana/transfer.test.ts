import { PublicKey, VersionedTransaction, Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import {
  buildTransferTransaction,
  sendTransferTransaction,
} from '../../../lib/solana/transfer';
import { PLAY_MINT, PLAY_DECIMALS, TREASURY_PUBKEY, PREMIUM_PACK_PRICE } from '../../../lib/solana/constants';

describe('solana/transfer', () => {
  const mockBuyer = new PublicKey('BuyerPubkeyForTestingTransferFlow');
  const mockPackId = 'pack-uuid-1234';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildTransferTransaction', () => {
    it('returns transaction, blockhash, and lastValidBlockHeight', async () => {
      const result = await buildTransferTransaction(mockBuyer, mockPackId);

      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('blockhash');
      expect(result).toHaveProperty('lastValidBlockHeight');
    });

    it('returns a VersionedTransaction', async () => {
      const { transaction } = await buildTransferTransaction(mockBuyer, mockPackId);
      expect(transaction).toBeInstanceOf(VersionedTransaction);
    });

    it('returns correct blockhash from connection', async () => {
      const { blockhash } = await buildTransferTransaction(mockBuyer, mockPackId);
      expect(blockhash).toBe('mockBlockhash123');
    });

    it('calls getAssociatedTokenAddress for buyer and treasury', async () => {
      await buildTransferTransaction(mockBuyer, mockPackId);

      expect(getAssociatedTokenAddress).toHaveBeenCalledTimes(2);
      // First call: buyer ATA for PLAY
      expect(getAssociatedTokenAddress).toHaveBeenCalledWith(PLAY_MINT, mockBuyer);
      // Second call: treasury ATA for PLAY
      expect(getAssociatedTokenAddress).toHaveBeenCalledWith(PLAY_MINT, TREASURY_PUBKEY);
    });

    it('creates an idempotent ATA instruction for the treasury', async () => {
      await buildTransferTransaction(mockBuyer, mockPackId);

      expect(createAssociatedTokenAccountIdempotentInstruction).toHaveBeenCalledTimes(1);
      expect(createAssociatedTokenAccountIdempotentInstruction).toHaveBeenCalledWith(
        mockBuyer,
        expect.anything(), // treasuryAta (from mock)
        TREASURY_PUBKEY,
        PLAY_MINT
      );
    });

    it('creates a transferChecked instruction with correct params', async () => {
      await buildTransferTransaction(mockBuyer, mockPackId);

      expect(createTransferCheckedInstruction).toHaveBeenCalledTimes(1);
      expect(createTransferCheckedInstruction).toHaveBeenCalledWith(
        expect.anything(), // buyerAta
        PLAY_MINT,
        expect.anything(), // treasuryAta
        mockBuyer,
        PREMIUM_PACK_PRICE,
        PLAY_DECIMALS
      );
    });
  });

  describe('sendTransferTransaction', () => {
    it('returns a transaction signature string', async () => {
      const mockTx = new VersionedTransaction({} as any);
      const sig = await sendTransferTransaction(mockTx);
      expect(typeof sig).toBe('string');
      expect(sig).toBe('mockSignature123');
    });

    it('serializes the transaction before sending', async () => {
      const mockTx = new VersionedTransaction({} as any);
      const spy = jest.spyOn(mockTx, 'serialize');
      await sendTransferTransaction(mockTx);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
