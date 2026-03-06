/**
 * Supabase Client for React Native
 *
 * Uses @supabase/supabase-js with AsyncStorage for auth persistence.
 * In React Native we call Supabase directly (no API routes).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function isUsableValue(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0 && !val.startsWith('$');
}

function resolveEnv(extraKey: string, envKey: string): string {
  const fromExtra = Constants.expoConfig?.extra?.[extraKey];
  if (isUsableValue(fromExtra)) return fromExtra;
  const fromEnv = process.env[envKey];
  if (isUsableValue(fromEnv)) return fromEnv;
  return '';
}

const rawUrl = resolveEnv('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
const rawKey = resolveEnv('SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

const isValidUrl = (s: string) => s.startsWith('http://') || s.startsWith('https://');
const safeUrl = isValidUrl(rawUrl) ? rawUrl : 'https://placeholder.supabase.co';
const safeKey = rawKey || 'placeholder';

if (safeUrl.includes('placeholder')) {
  console.warn(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
      'Set them in app.json extra or as EXPO_PUBLIC_ env vars.'
  );
}

/**
 * Singleton Supabase client for the mobile app.
 * Auth tokens are persisted to AsyncStorage automatically.
 */
export const supabase = createSupabaseClient(safeUrl, safeKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // No URL handling in React Native
  },
});

export default supabase;
