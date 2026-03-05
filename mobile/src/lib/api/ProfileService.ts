/**
 * Profile Service
 *
 * Direct Supabase calls for user profile operations.
 * Replaces the web app's /api/profile route.
 */

import { supabase } from '../supabase/client';
import type { UserProfile } from '../../types';

// ============================================
// Random Name Generation
// ============================================

const ADJECTIVES = [
  'Swift', 'Brave', 'Lucky', 'Fast', 'Clever', 'Bold', 'Wild',
  'Cool', 'Sharp', 'Quick', 'Keen', 'Fierce', 'Storm', 'Thunder',
  'Shadow', 'Cosmic', 'Crypto', 'Alpha', 'Omega', 'Stellar',
  'Mystic', 'Neon', 'Cyber', 'Golden', 'Silver', 'Iron', 'Steel',
];

const ANIMALS = [
  'Wolf', 'Tiger', 'Eagle', 'Falcon', 'Lion', 'Bear', 'Hawk',
  'Shark', 'Panther', 'Fox', 'Dragon', 'Phoenix', 'Raven', 'Viper',
  'Cobra', 'Jaguar', 'Leopard', 'Lynx', 'Puma', 'Raptor',
  'Condor', 'Griffin', 'Hydra', 'Kraken', 'Titan', 'Phantom',
];

export function generateRandomDisplayName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${adjective}${animal}_${number}`;
}

// ============================================
// Profile Operations
// ============================================

export interface ProfileWithId {
  profileId: string;
  profile: UserProfile;
}

/**
 * Get or create a profile for an anonymous user.
 * Replaces GET /api/profile?anonymousId=xxx
 */
export async function getOrCreateProfile(
  anonymousId: string
): Promise<ProfileWithId | null> {
  // Try the PostgreSQL function first
  const { data: funcData, error: funcError } = await supabase.rpc(
    'get_or_create_anonymous_profile',
    { p_anonymous_id: anonymousId }
  );

  if (!funcError && funcData) {
    const profileId = funcData as string;
    const profile = await fetchProfileById(profileId);

    if (profile) {
      if (!profile.display_name) {
        const displayName = generateRandomDisplayName();
        await updateDisplayName(profileId, displayName);
        const updated = await fetchProfileById(profileId);
        if (updated) return { profileId, profile: updated };
      }
      return { profileId, profile };
    }
  }

  // Fallback: manual check-and-create
  const { data: existing, error: selectError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('anonymous_id', anonymousId)
    .single();

  if (existing && !selectError) {
    if (!existing.display_name) {
      const displayName = generateRandomDisplayName();
      await updateDisplayName(existing.id, displayName);
      const updated = await fetchProfileById(existing.id);
      if (updated) return { profileId: existing.id, profile: updated };
    }
    return { profileId: existing.id, profile: existing as UserProfile };
  }

  // Create new profile
  const displayName = generateRandomDisplayName();
  const now = new Date().toISOString();

  const { data: newProfile, error: insertError } = await supabase
    .from('user_profiles')
    .insert({
      anonymous_id: anonymousId,
      display_name: displayName,
      username: displayName.toLowerCase(),
      total_points: 0,
      total_packs_opened: 0,
      total_picks_made: 0,
      total_correct_picks: 0,
      current_streak: 0,
      longest_streak: 0,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Error creating profile:', insertError);
    return null;
  }

  return {
    profileId: newProfile.id,
    profile: newProfile as UserProfile,
  };
}

/**
 * Fetch a profile by its database ID.
 */
export async function fetchProfileById(profileId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    console.error('Error fetching profile by ID:', error);
    return null;
  }
  return data as UserProfile;
}

/**
 * Fetch a profile by anonymous ID.
 */
export async function fetchProfileByAnonymousId(
  anonymousId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('anonymous_id', anonymousId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching profile by anonymous ID:', error);
    }
    return null;
  }
  return data as UserProfile;
}

/**
 * Update profile display name.
 * Replaces POST /api/profile with displayName.
 */
export async function updateDisplayName(
  profileId: string,
  displayName: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      display_name: displayName,
      username: displayName.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (error) {
    console.error('Error updating display name:', error);
    return false;
  }
  return true;
}

/**
 * Update profile stats after completing a pack.
 */
export async function updateProfileStats(
  profileId: string,
  stats: {
    pointsToAdd: number;
    packsToAdd: number;
    picksToAdd: number;
    correctPicksToAdd: number;
  }
): Promise<boolean> {
  const { data: current, error: fetchError } = await supabase
    .from('user_profiles')
    .select('total_points, total_packs_opened, total_picks_made, total_correct_picks')
    .eq('id', profileId)
    .single();

  if (fetchError) {
    console.error('Error fetching profile for stats update:', fetchError);
    return false;
  }

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      total_points: (current.total_points ?? 0) + stats.pointsToAdd,
      total_packs_opened: (current.total_packs_opened ?? 0) + stats.packsToAdd,
      total_picks_made: (current.total_picks_made ?? 0) + stats.picksToAdd,
      total_correct_picks: (current.total_correct_picks ?? 0) + stats.correctPicksToAdd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (updateError) {
    console.error('Error updating profile stats:', updateError);
    return false;
  }
  return true;
}

/**
 * Increment streak on correct pick.
 */
export async function incrementStreak(profileId: string): Promise<boolean> {
  const { data: current, error: fetchError } = await supabase
    .from('user_profiles')
    .select('current_streak, longest_streak')
    .eq('id', profileId)
    .single();

  if (fetchError) {
    console.error('Error fetching profile for streak:', fetchError);
    return false;
  }

  const newStreak = (current.current_streak ?? 0) + 1;
  const longestStreak = Math.max(newStreak, current.longest_streak ?? 0);

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (updateError) {
    console.error('Error updating streak:', updateError);
    return false;
  }
  return true;
}

/**
 * Reset streak on incorrect pick.
 */
export async function resetStreak(profileId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      current_streak: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (error) {
    console.error('Error resetting streak:', error);
    return false;
  }
  return true;
}
