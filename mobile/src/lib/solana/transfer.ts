/**
 * PLAY Token Transfer for Premium Pack Purchase (React Native)
 *
 * Alternative to the Anchor program — sends a direct SPL token
 * transfer of PLAY to the treasury wallet.
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
  PLAY_MINT,
  PLAY_DECIMALS,
  TREASURY_PUBKEY,
  RPC_URL,
  PREMIUM_PACK_PRICE,
} from './constants';

/**
 * Build a PLAY token transfer transaction ready for signing.
 *
 * Returns the unsigned VersionedTransaction — the caller signs via
 * Mobile Wallet Adapter's transact() + signTransactions().
 */
export async function buildTransferTransaction(
  buyer: PublicKey,
  _packId: string
): Promise<{
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = new Connection(RPC_URL, 'confirmed');

  const buyerAta = await getAssociatedTokenAddress(PLAY_MINT, buyer);
  const treasuryAta = await getAssociatedTokenAddress(PLAY_MINT, TREASURY_PUBKEY);

  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    buyer,
    treasuryAta,
    TREASURY_PUBKEY,
    PLAY_MINT
  );

  const transferIx = createTransferCheckedInstruction(
    buyerAta,
    PLAY_MINT,
    treasuryAta,
    buyer,
    PREMIUM_PACK_PRICE,
    PLAY_DECIMALS
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
 * Send a signed transfer transaction and return the signature + blockhash info
 * for confirmation tracking.
 */
export async function sendTransferTransaction(
  signedTransaction: VersionedTransaction,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<{ signature: string; blockhash: string; lastValidBlockHeight: number }> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  return { signature, blockhash, lastValidBlockHeight };
}
