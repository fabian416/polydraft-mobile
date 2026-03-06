/**
 * Solana Purchase Transaction Builder (React Native)
 *
 * Builds the buy_pack instruction for premium pack purchases.
 * Designed to work with Mobile Wallet Adapter's transact() callback.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
import {
  PROGRAM_ID,
  USDC_MINT,
  TREASURY_PUBKEY,
  RPC_URL,
  PREMIUM_PACK_PRICE,
} from './constants';

/** Anchor discriminator for buy_pack instruction (first 8 bytes of sha256("global:buy_pack")) */
const BUY_PACK_DISCRIMINATOR = Buffer.from([
  139, 119, 84, 201, 243, 31, 236, 11,
]);

// ============================================
// PDA Derivation
// ============================================

function sanitizeSeed(uuid: string): string {
  return uuid.replace(/-/g, '');
}

export function derivePurchaseReceiptPDA(
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
// Instruction Builder
// ============================================

function encodeBuyPackArgs(clientSeed: string, amount: bigint): Buffer {
  const seedBytes = Buffer.from(clientSeed);
  const buf = Buffer.alloc(8 + 4 + seedBytes.length + 8);
  let offset = 0;

  // Discriminator
  BUY_PACK_DISCRIMINATOR.copy(buf, offset);
  offset += 8;

  // String: 4-byte LE length prefix + UTF-8 bytes
  buf.writeUInt32LE(seedBytes.length, offset);
  offset += 4;
  seedBytes.copy(buf, offset);
  offset += seedBytes.length;

  // u64: 8-byte LE
  buf.writeBigUInt64LE(amount, offset);

  return buf;
}

async function buildBuyPackInstruction(
  buyer: PublicKey,
  clientSeed: string,
  amount: bigint
): Promise<TransactionInstruction> {
  const buyerUsdc = await getAssociatedTokenAddress(USDC_MINT, buyer);
  const treasuryUsdc = await getAssociatedTokenAddress(USDC_MINT, TREASURY_PUBKEY);
  const [receiptPda] = derivePurchaseReceiptPDA(buyer, clientSeed);

  const data = encodeBuyPackArgs(clientSeed, amount);

  const keys = [
    { pubkey: buyer, isSigner: true, isWritable: true },
    { pubkey: buyerUsdc, isSigner: false, isWritable: true },
    { pubkey: treasuryUsdc, isSigner: false, isWritable: true },
    { pubkey: USDC_MINT, isSigner: false, isWritable: false },
    { pubkey: receiptPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });
}

// ============================================
// Public API
// ============================================

/**
 * Build a premium pack purchase transaction ready for signing.
 *
 * Returns the unsigned VersionedTransaction — the caller is responsible for
 * signing via Mobile Wallet Adapter's transact() + signTransactions().
 */
export async function buildPurchaseTransaction(
  buyer: PublicKey,
  clientSeed: string
): Promise<{
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const amount = BigInt(PREMIUM_PACK_PRICE);
  const sanitized = sanitizeSeed(clientSeed);

  const ix = await buildBuyPackInstruction(buyer, sanitized, amount);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: buyer,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  return { transaction, blockhash, lastValidBlockHeight };
}

/**
 * Send a signed purchase transaction and return the signature + blockhash info
 * needed for confirmation.
 */
export async function sendPurchaseTransaction(
  signedTransaction: VersionedTransaction,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<{
  signature: string;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize()
  );
  return { signature, blockhash, lastValidBlockHeight };
}

export { PREMIUM_PACK_PRICE };
