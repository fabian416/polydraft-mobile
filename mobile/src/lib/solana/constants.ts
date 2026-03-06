import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey(
  '2kFruWkndEjnMJkFR5dkKbLjuCpoZ2nx3rHx9KFutKx1'
);

export const USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);

export const TREASURY_PUBKEY = new PublicKey(
  process.env.EXPO_PUBLIC_TREASURY_PUBKEY || '11111111111111111111111111111111'
);

export const RPC_URL =
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const PREMIUM_PACK_PRICE = 100_000_000; // 100 PLAY (6 decimals)

export const PLAY_MINT = new PublicKey(
  'PLAYs3GSSadH2q2JLS7djp7yzeT75NK78XgrE5YLrfq'
);
export const PLAY_DECIMALS = 6;

export const AUTH_MESSAGE_PREFIX =
  'Sign this message to authenticate with Polydraft.\n\nNonce: ';
