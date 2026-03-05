/**
 * Purchase Receipt Verification (React Native)
 *
 * Verifies that a purchase receipt PDA exists on-chain,
 * belongs to our program, and contains the expected data.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { PROGRAM_ID, RPC_URL } from './constants';

/** Anchor account discriminator for PurchaseReceipt */
const RECEIPT_DISCRIMINATOR = Buffer.from([
  79, 127, 115, 104, 109, 54, 216, 32,
]);

// ============================================
// Deserialization
// ============================================

interface PurchaseReceiptData {
  buyer: PublicKey;
  amount: bigint;
  clientSeed: string;
  timestamp: bigint;
  bump: number;
}

function deserializeReceipt(data: Buffer): PurchaseReceiptData | null {
  if (data.length < 8) return null;

  const disc = data.subarray(0, 8);
  if (!disc.equals(RECEIPT_DISCRIMINATOR)) return null;

  let offset = 8;

  const buyer = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const amount = data.readBigUInt64LE(offset);
  offset += 8;

  const seedLen = data.readUInt32LE(offset);
  offset += 4;
  const clientSeed = data.subarray(offset, offset + seedLen).toString('utf-8');
  offset += seedLen;

  const timestamp = data.readBigInt64LE(offset);
  offset += 8;

  const bump = data.readUInt8(offset);

  return { buyer, amount, clientSeed, timestamp, bump };
}

// ============================================
// PDA Derivation
// ============================================

function sanitizeSeed(uuid: string): string {
  return uuid.replace(/-/g, '');
}

function derivePurchaseReceiptPDA(
  buyer: PublicKey,
  clientSeed: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('purchase'),
      buyer.toBuffer(),
      Buffer.from(sanitizeSeed(clientSeed)),
    ],
    PROGRAM_ID
  );
}

// ============================================
// Verification
// ============================================

export async function verifyPurchaseReceipt(
  buyerWallet: string,
  packId: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const buyer = new PublicKey(buyerWallet);
    const [receiptPda] = derivePurchaseReceiptPDA(buyer, packId);

    const accountInfo = await connection.getAccountInfo(receiptPda);

    if (!accountInfo) {
      console.error('Purchase receipt PDA not found on-chain');
      return false;
    }

    if (!accountInfo.owner.equals(PROGRAM_ID)) {
      console.error('Receipt account not owned by our program');
      return false;
    }

    const receipt = deserializeReceipt(Buffer.from(accountInfo.data));
    if (!receipt) {
      console.error('Failed to deserialize receipt');
      return false;
    }

    if (!receipt.buyer.equals(buyer)) {
      console.error('Receipt buyer mismatch');
      return false;
    }

    if (receipt.amount !== BigInt(expectedAmount)) {
      console.error('Receipt amount mismatch');
      return false;
    }

    if (receipt.clientSeed !== sanitizeSeed(packId)) {
      console.error('Receipt client_seed mismatch');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying purchase receipt:', error);
    return false;
  }
}
