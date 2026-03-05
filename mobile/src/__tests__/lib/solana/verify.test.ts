import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { verifyPurchaseReceipt } from '../../../lib/solana/verify';
import { PROGRAM_ID } from '../../../lib/solana/constants';

/** Anchor account discriminator for PurchaseReceipt */
const RECEIPT_DISCRIMINATOR = Buffer.from([
  79, 127, 115, 104, 109, 54, 216, 32,
]);

/**
 * Build a valid receipt data buffer matching the on-chain layout:
 * [8 discriminator][32 buyer][8 amount][4 seed_len][N seed_bytes][8 timestamp][1 bump]
 */
function buildReceiptData(opts: {
  buyer: PublicKey;
  amount: bigint;
  clientSeed: string;
  timestamp?: bigint;
  bump?: number;
}): Buffer {
  const seedBytes = Buffer.from(opts.clientSeed);
  const buf = Buffer.alloc(8 + 32 + 8 + 4 + seedBytes.length + 8 + 1);
  let offset = 0;

  RECEIPT_DISCRIMINATOR.copy(buf, offset);
  offset += 8;

  opts.buyer.toBuffer().copy(buf, offset);
  offset += 32;

  buf.writeBigUInt64LE(opts.amount, offset);
  offset += 8;

  buf.writeUInt32LE(seedBytes.length, offset);
  offset += 4;
  seedBytes.copy(buf, offset);
  offset += seedBytes.length;

  buf.writeBigInt64LE(opts.timestamp ?? BigInt(1700000000), offset);
  offset += 8;

  buf.writeUInt8(opts.bump ?? 255, offset);

  return buf;
}

describe('solana/verify', () => {
  const buyerAddress = 'BuyerPubkeyForTestingVerify123456';
  const packId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const sanitizedPackId = packId.replace(/-/g, '');
  const expectedAmount = 100_000_000;
  const mockBuyer = new PublicKey(buyerAddress);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when receipt PDA does not exist', () => {
    it('returns false', async () => {
      // Default mock returns null for getAccountInfo
      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });

  describe('when receipt exists but is owned by wrong program', () => {
    it('returns false', async () => {
      const wrongOwner = new PublicKey('WrongProgramOwner11111111111111');
      jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValueOnce({
        data: buildReceiptData({
          buyer: mockBuyer,
          amount: BigInt(expectedAmount),
          clientSeed: sanitizedPackId,
        }),
        owner: wrongOwner,
        executable: false,
        lamports: 1000000,
      } as never);

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });

  describe('when receipt data is too short to deserialize', () => {
    it('returns false', async () => {
      jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValueOnce({
        data: Buffer.alloc(4), // too short
        owner: PROGRAM_ID,
        executable: false,
        lamports: 1000000,
      } as never);

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });

  describe('when receipt has wrong discriminator', () => {
    it('returns false', async () => {
      const badData = buildReceiptData({
        buyer: mockBuyer,
        amount: BigInt(expectedAmount),
        clientSeed: sanitizedPackId,
      });
      // Corrupt the discriminator
      badData[0] = 0;
      badData[1] = 0;

      jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValueOnce({
        data: badData,
        owner: PROGRAM_ID,
        executable: false,
        lamports: 1000000,
      } as never);

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });

  describe('when receipt buyer does not match', () => {
    it('returns false', async () => {
      const differentBuyer = new PublicKey('DifferentBuyerPublicKey123456789');

      jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValueOnce({
        data: buildReceiptData({
          buyer: differentBuyer,
          amount: BigInt(expectedAmount),
          clientSeed: sanitizedPackId,
        }),
        owner: PROGRAM_ID,
        executable: false,
        lamports: 1000000,
      } as never);

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });

  describe('when receipt amount does not match', () => {
    it('returns false', async () => {
      jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValueOnce({
        data: buildReceiptData({
          buyer: mockBuyer,
          amount: BigInt(50_000_000), // wrong amount
          clientSeed: sanitizedPackId,
        }),
        owner: PROGRAM_ID,
        executable: false,
        lamports: 1000000,
      } as never);

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });

  describe('when receipt client_seed does not match', () => {
    it('returns false', async () => {
      jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValueOnce({
        data: buildReceiptData({
          buyer: mockBuyer,
          amount: BigInt(expectedAmount),
          clientSeed: 'completelydifferentseed',
        }),
        owner: PROGRAM_ID,
        executable: false,
        lamports: 1000000,
      } as never);

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });

  describe('when receipt is fully valid', () => {
    it('returns true', async () => {
      jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValueOnce({
        data: buildReceiptData({
          buyer: mockBuyer,
          amount: BigInt(expectedAmount),
          clientSeed: sanitizedPackId,
        }),
        owner: PROGRAM_ID,
        executable: false,
        lamports: 1000000,
      } as never);

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(true);
    });
  });

  describe('when connection throws an error', () => {
    it('returns false and does not throw', async () => {
      jest.spyOn(Connection.prototype, 'getAccountInfo').mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await verifyPurchaseReceipt(buyerAddress, packId, expectedAmount);
      expect(result).toBe(false);
    });
  });
});
