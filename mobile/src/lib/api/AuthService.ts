/**
 * Auth Service
 *
 * Direct Supabase calls for wallet-based authentication.
 * Replaces the web app's /api/auth/nonce and /api/auth/verify routes.
 *
 * NOTE: The web app uses a server-side JWT_SECRET and service-role key
 * for nonce management and JWT minting. On mobile, we still need a
 * backend endpoint for the verify step (JWT minting requires a secret).
 * The getNonce call can be done directly via Supabase with proper RLS,
 * but verify must go through a secure backend.
 *
 * For now this module provides the same interface; the verify function
 * calls the web API endpoint as a fallback until a dedicated mobile
 * backend is available.
 */

import { supabase } from '../supabase/client';
import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  '';

const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ============================================
// Nonce
// ============================================

/**
 * Request a nonce for wallet authentication.
 * Invalidates old unused nonces and creates a new one.
 */
export async function getNonce(
  address: string
): Promise<{ nonce: string } | { error: string }> {
  if (!address || !ADDRESS_RE.test(address)) {
    return { error: 'Invalid wallet address' };
  }

  // Invalidate old unused nonces
  await supabase
    .from('auth_nonces')
    .update({ used: true })
    .eq('wallet_address', address)
    .eq('used', false);

  // Generate nonce (64 hex chars)
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { error } = await supabase.from('auth_nonces').insert({
    wallet_address: address,
    nonce,
  });

  if (error) {
    console.error('Failed to create nonce:', error);
    return { error: 'Failed to create nonce' };
  }

  return { nonce };
}

// ============================================
// Verify
// ============================================

export interface VerifyResult {
  token: string;
  profileId: string;
  address: string;
}

/**
 * Verify a wallet signature and get an auth token.
 *
 * This calls the web API because JWT minting requires a server-side secret.
 * When a dedicated mobile backend is available, update this URL.
 */
export async function verifySignature(
  address: string,
  signature: string,
  nonce: string
): Promise<VerifyResult | { error: string }> {
  if (!address || !signature || !nonce) {
    return { error: 'Missing address, signature, or nonce' };
  }

  if (!API_BASE_URL) {
    return { error: 'API_BASE_URL not configured' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, nonce }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Verification failed' };
    }

    return {
      token: data.token,
      profileId: data.profileId,
      address: data.address,
    };
  } catch (err) {
    console.error('Error verifying signature:', err);
    return { error: 'Network error during verification' };
  }
}
