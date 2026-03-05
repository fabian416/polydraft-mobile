/**
 * Wallet-based Authentication (React Native)
 *
 * Nonce-based sign-message flow for authenticating with the Polydraft API.
 * Uses Mobile Wallet Adapter for signing.
 */

import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { AUTH_MESSAGE_PREFIX } from './constants';
import { API_BASE_URL } from '../constants';

/**
 * Fetch a nonce from the API server for the given wallet address.
 */
async function fetchNonce(address: string): Promise<string> {
  const res = await fetch(
    `${API_BASE_URL}/api/auth/nonce?address=${encodeURIComponent(address)}`
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to get nonce');
  }
  const { nonce } = await res.json();
  return nonce;
}

/**
 * Verify a signed nonce with the API server and get a JWT.
 */
async function verifySignature(
  address: string,
  signature: string,
  nonce: string
): Promise<{ token: string; profileId: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, nonce }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Verification failed');
  }
  return res.json();
}

/**
 * Build the message bytes that the wallet needs to sign.
 */
export function buildAuthMessage(nonce: string): Uint8Array {
  return new TextEncoder().encode(`${AUTH_MESSAGE_PREFIX}${nonce}`);
}

/**
 * Encode a signature as base58 for API submission.
 */
function encodeSignature(signatureBytes: Uint8Array): string {
  // Base58 encoding without external dependency
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = Buffer.from(signatureBytes);
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result += ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += ALPHABET[digits[i]];
  }
  return result;
}

export interface AuthResult {
  token: string;
  profileId: string;
  walletAddress: string;
}

/**
 * Full wallet authentication flow:
 * 1. Fetch nonce from server
 * 2. Sign the nonce message (caller provides signMessage)
 * 3. Verify signature with server
 * 4. Return JWT + profileId
 */
export async function authenticateWithWallet(
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<AuthResult> {
  const address = publicKey.toBase58();

  // 1. Fetch nonce
  const nonce = await fetchNonce(address);

  // 2. Sign message
  const message = buildAuthMessage(nonce);
  const signatureBytes = await signMessage(message);
  const signature = encodeSignature(signatureBytes);

  // 3. Verify with server
  const { token, profileId } = await verifySignature(address, signature, nonce);

  return { token, profileId, walletAddress: address };
}
