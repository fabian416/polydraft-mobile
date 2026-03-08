/**
 * USDC Token Transfer for Premium Pack Purchase (React Native)
 *
 * Sends a direct SPL token transfer of USDC to the treasury wallet.
 * This is the simple transfer approach (no Anchor program needed).
 */

import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import {
  USDC_MINT,
  TREASURY_PUBKEY,
  RPC_URL,
  PREMIUM_PACK_PRICE,
} from './constants';

const USDC_DECIMALS = 6;

/**
 * Build a USDC token transfer transaction ready for signing.
 *
 * @param buyer - The buyer's public key (connected wallet)
 * @param amount - Amount in USDC base units (default: PREMIUM_PACK_PRICE = 1_000_000 = 1 USDC)
 *
 * Returns the unsigned VersionedTransaction — the caller signs via
 * Mobile Wallet Adapter's transact() + signTransactions().
 */
export async function buildUsdcTransferTransaction(
  buyer: PublicKey,
  amount: number = PREMIUM_PACK_PRICE
): Promise<{
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = new Connection(RPC_URL, 'confirmed');

  const buyerAta = await getAssociatedTokenAddress(USDC_MINT, buyer);
  const treasuryAta = await getAssociatedTokenAddress(USDC_MINT, TREASURY_PUBKEY);

  // Ensure treasury ATA exists (idempotent — no-op if it already does)
  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    buyer,
    treasuryAta,
    TREASURY_PUBKEY,
    USDC_MINT
  );

  const transferIx = createTransferCheckedInstruction(
    buyerAta,
    USDC_MINT,
    treasuryAta,
    buyer,
    amount,
    USDC_DECIMALS
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: buyer,
    recentBlockhash: blockhash,
    instructions: [createAtaIx, transferIx],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  return { transaction, blockhash, lastValidBlockHeight };
}

/**
 * Send a signed transfer transaction and confirm it on-chain.
 *
 * Returns the transaction signature once confirmed.
 */
export async function sendAndConfirmTransfer(
  signedTransaction: VersionedTransaction,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<string> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return signature;
}
