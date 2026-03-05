/**
 * Supabase Client for React Native
 *
 * Uses @supabase/supabase-js with AsyncStorage for auth persistence.
 * In React Native we call Supabase directly (no API routes).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  '';

const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
      'Set them in app.json extra or as EXPO_PUBLIC_ env vars.'
  );
}

/**
 * Singleton Supabase client for the mobile app.
 * Auth tokens are persisted to AsyncStorage automatically.
 */
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // No URL handling in React Native
  },
});

export default supabase;
