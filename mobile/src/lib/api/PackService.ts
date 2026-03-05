/**
 * Pack Service
 *
 * Direct Supabase calls for pack and pick CRUD operations.
 * Replaces the web app's /api/packs/* routes.
 */

import { supabase } from '../supabase/client';
import type { Outcome, UserPack, UserPick } from '../../types';

// ============================================
// Constants
// ============================================

export const WEEKLY_PACK_LIMIT = 2;

// ============================================
// Week Calculations
// ============================================

function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getCurrentWeekEnd(): Date {
  const weekStart = getCurrentWeekStart();
  const sunday = new Date(weekStart);
  sunday.setUTCDate(weekStart.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

// ============================================
// Types
// ============================================

export interface WeeklyPackStatus {
  packsOpenedThisWeek: number;
  packsRemaining: number;
  canOpenPack: boolean;
  weeklyLimit: number;
  weekStartsAt: string;
  weekEndsAt: string;
}

export interface CreatePackInput {
  id: string;
  profileId: string;
  anonymousId?: string;
  packTypeSlug: string;
  openedAt: string;
  isPremium?: boolean;
  paymentSignature?: string;
  paymentAmount?: number;
  buyerWallet?: string;
}

export interface CreatePickInput {
  id: string;
  userPackId: string;
  eventId: string;
  position: number;
  pickedOutcome: Outcome;
  pickedAt: string;
  probabilitySnapshot: number;
  oppositeProbabilitySnapshot: number;
  drawProbabilitySnapshot?: number;
}

// ============================================
// Pack Operations
// ============================================

async function getPackTypeBySlug(slug: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('pack_types')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching pack type:', error);
    return null;
  }
  return data;
}

export async function packExists(packId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_packs')
    .select('id')
    .eq('id', packId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return false;
    console.error('Error checking pack existence:', error);
    return false;
  }
  return !!data;
}

export async function createPack(
  input: CreatePackInput
): Promise<{ id: string } | { error: string }> {
  const packType = await getPackTypeBySlug(input.packTypeSlug);
  if (!packType) {
    return { error: `Pack type not found for slug: ${input.packTypeSlug}` };
  }

  const insertData: Record<string, unknown> = {
    id: input.id,
    profile_id: input.profileId,
    ...(input.anonymousId && { anonymous_id: input.anonymousId }),
    pack_type_id: packType.id,
    opened_at: input.openedAt,
    resolution_status: 'pending',
    current_reveal_index: 0,
    total_points: 0,
    correct_picks: 0,
    created_at: input.openedAt,
    updated_at: input.openedAt,
  };

  if (input.isPremium) {
    insertData.is_premium = true;
    insertData.payment_signature = input.paymentSignature;
    insertData.payment_amount = input.paymentAmount;
    insertData.buyer_wallet = input.buyerWallet;
  }

  const { data, error } = await supabase
    .from('user_packs')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    const msg = `Supabase insert error: ${error.code} - ${error.message} (${error.details})`;
    console.error('Error creating pack:', msg);
    return { error: msg };
  }
  return { id: data.id };
}

export async function createPicks(
  picks: CreatePickInput[]
): Promise<{ success: true } | { error: string }> {
  const picksToInsert = picks.map((pick) => ({
    user_pack_id: pick.userPackId,
    event_id: pick.eventId,
    position: pick.position,
    picked_outcome: pick.pickedOutcome,
    picked_at: pick.pickedAt,
    probability_snapshot: pick.probabilitySnapshot,
    opposite_probability_snapshot: pick.oppositeProbabilitySnapshot,
    draw_probability_snapshot: pick.drawProbabilitySnapshot,
    is_resolved: false,
    points_awarded: 0,
    reveal_animation_played: false,
    created_at: pick.pickedAt,
  }));

  const { error } = await supabase.from('user_picks').insert(picksToInsert);

  if (error) {
    const msg = `Supabase insert error: ${error.code} - ${error.message} (${error.details})`;
    console.error('Error creating picks:', msg);
    return { error: msg };
  }
  return { success: true };
}

export async function createPackWithPicks(
  packInput: CreatePackInput,
  picksInput: Omit<CreatePickInput, 'userPackId'>[]
): Promise<{ packId: string } | { error: string }> {
  const packResult = await createPack(packInput);
  if ('error' in packResult) {
    return { error: `createPack failed: ${packResult.error}` };
  }

  const packId = packResult.id;
  const picksWithPackId = picksInput.map((pick) => ({
    ...pick,
    userPackId: packId,
  }));

  const picksResult = await createPicks(picksWithPackId);
  if ('error' in picksResult) {
    return { error: `createPicks failed for pack ${packId}: ${picksResult.error}` };
  }

  return { packId };
}

export async function getPackById(packId: string): Promise<UserPack | null> {
  const { data, error } = await supabase
    .from('user_packs')
    .select(`*, picks:user_picks(*)`)
    .eq('id', packId)
    .single();

  if (error) {
    console.error('Error fetching pack:', error);
    return null;
  }
  return data as unknown as UserPack;
}

export async function getPacksByProfileId(profileId: string): Promise<UserPack[]> {
  const { data, error } = await supabase
    .from('user_packs')
    .select(`*, picks:user_picks(*)`)
    .eq('profile_id', profileId)
    .order('opened_at', { ascending: false });

  if (error) {
    console.error('Error fetching packs:', error);
    return [];
  }
  return (data as unknown as UserPack[]) ?? [];
}

export async function updatePackResolution(
  packId: string,
  status: 'pending' | 'partially_resolved' | 'fully_resolved',
  totalPoints?: number,
  correctPicks?: number
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    resolution_status: status,
    updated_at: new Date().toISOString(),
  };

  if (totalPoints !== undefined) updateData.total_points = totalPoints;
  if (correctPicks !== undefined) updateData.correct_picks = correctPicks;
  if (status === 'fully_resolved') updateData.fully_resolved_at = new Date().toISOString();

  const { error } = await supabase
    .from('user_packs')
    .update(updateData)
    .eq('id', packId);

  if (error) {
    console.error('Error updating pack resolution:', error);
    return false;
  }
  return true;
}

export async function markPickRevealed(pickId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_picks')
    .update({ reveal_animation_played: true })
    .eq('id', pickId);

  if (error) {
    console.error('Error marking pick revealed:', error);
    return false;
  }
  return true;
}

// ============================================
// Weekly Pack Status
// ============================================

export async function countWeeklyPacks(profileId: string): Promise<number> {
  const weekStart = getCurrentWeekStart();
  const weekEnd = getCurrentWeekEnd();

  const { count, error } = await supabase
    .from('user_packs')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_premium', false)
    .gte('opened_at', weekStart.toISOString())
    .lte('opened_at', weekEnd.toISOString());

  if (error) {
    console.error('Error counting weekly packs:', error);
    return 0;
  }
  return count ?? 0;
}

export async function getWeeklyPackStatus(profileId: string): Promise<WeeklyPackStatus> {
  const packsOpenedThisWeek = await countWeeklyPacks(profileId);
  const packsRemaining = Math.max(0, WEEKLY_PACK_LIMIT - packsOpenedThisWeek);
  const weekStart = getCurrentWeekStart();
  const weekEnd = getCurrentWeekEnd();

  return {
    packsOpenedThisWeek,
    packsRemaining,
    canOpenPack: packsRemaining > 0,
    weeklyLimit: WEEKLY_PACK_LIMIT,
    weekStartsAt: weekStart.toISOString(),
    weekEndsAt: weekEnd.toISOString(),
  };
}

/**
 * Check pack availability for a user.
 * Combines profile lookup + weekly status (replaces /api/packs/availability).
 */
export async function checkAvailability(
  anonymousId: string
): Promise<WeeklyPackStatus> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('anonymous_id', anonymousId)
    .single();

  if (!profile) {
    return {
      packsOpenedThisWeek: 0,
      packsRemaining: WEEKLY_PACK_LIMIT,
      canOpenPack: true,
      weeklyLimit: WEEKLY_PACK_LIMIT,
      weekStartsAt: getCurrentWeekStart().toISOString(),
      weekEndsAt: getCurrentWeekEnd().toISOString(),
    };
  }

  return getWeeklyPackStatus(profile.id);
}

/**
 * Get all packs for a user by anonymousId (replaces GET /api/packs).
 */
export async function getPacksForUser(
  anonymousId: string
): Promise<{ packs: UserPack[]; weeklyStatus: WeeklyPackStatus }> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('anonymous_id', anonymousId)
    .single();

  if (!profile) {
    return {
      packs: [],
      weeklyStatus: {
        packsOpenedThisWeek: 0,
        packsRemaining: WEEKLY_PACK_LIMIT,
        canOpenPack: true,
        weeklyLimit: WEEKLY_PACK_LIMIT,
        weekStartsAt: getCurrentWeekStart().toISOString(),
        weekEndsAt: getCurrentWeekEnd().toISOString(),
      },
    };
  }

  const [packs, weeklyStatus] = await Promise.all([
    getPacksByProfileId(profile.id),
    getWeeklyPackStatus(profile.id),
  ]);

  return { packs, weeklyStatus };
}
