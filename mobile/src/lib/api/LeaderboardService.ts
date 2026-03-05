/**
 * Leaderboard Service
 *
 * Direct Supabase calls for leaderboard data.
 * Replaces the web app's /api/leaderboard route.
 */

import { supabase } from '../supabase/client';

// ============================================
// Types
// ============================================

export interface LeaderboardEntry {
  rank: number;
  profileId: string;
  displayName: string;
  totalPoints: number;
  packsOpened: number;
  accuracy: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalPlayers: number;
  userRank?: number;
  userPoints?: number;
}

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

function getCurrentWeekId(): string {
  const weekStart = getCurrentWeekStart();
  const year = weekStart.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const pastDays = Math.floor(
    (weekStart.getTime() - startOfYear.getTime()) / 86400000
  );
  const weekNumber = Math.ceil((pastDays + startOfYear.getUTCDay() + 1) / 7);
  return `${year}-${String(weekNumber).padStart(2, '0')}`;
}

// ============================================
// Leaderboard Operations
// ============================================

/**
 * Get the current week's leaderboard.
 * Replaces GET /api/leaderboard.
 */
export async function getLeaderboard(
  limit: number = 10,
  offset: number = 0,
  anonymousId?: string
): Promise<LeaderboardResponse> {
  const weekStart = getCurrentWeekStart();
  const weekEnd = getCurrentWeekEnd();

  const { data: weeklyStats, error: statsError } = await supabase
    .from('user_packs')
    .select(`
      profile_id,
      total_points,
      correct_picks,
      user_profiles!inner (
        id,
        display_name,
        anonymous_id
      )
    `)
    .gte('opened_at', weekStart.toISOString())
    .lte('opened_at', weekEnd.toISOString());

  if (statsError) {
    console.error('Error fetching weekly stats:', statsError);
    return { entries: [], totalPlayers: 0 };
  }

  // Aggregate by profile
  const profileStats = new Map<
    string,
    {
      profileId: string;
      displayName: string;
      anonymousId: string;
      totalPoints: number;
      packsOpened: number;
      correctPicks: number;
      totalPicks: number;
    }
  >();

  for (const pack of weeklyStats ?? []) {
    const profile = pack.user_profiles as unknown as {
      id: string;
      display_name: string;
      anonymous_id: string;
    };

    const existing = profileStats.get(profile.id);
    if (existing) {
      existing.totalPoints += pack.total_points ?? 0;
      existing.packsOpened += 1;
      existing.correctPicks += pack.correct_picks ?? 0;
      existing.totalPicks += 5;
    } else {
      profileStats.set(profile.id, {
        profileId: profile.id,
        displayName: profile.display_name || 'Anonymous',
        anonymousId: profile.anonymous_id,
        totalPoints: pack.total_points ?? 0,
        packsOpened: 1,
        correctPicks: pack.correct_picks ?? 0,
        totalPicks: 5,
      });
    }
  }

  // Sort and rank
  const sorted = Array.from(profileStats.values()).sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  const ranked: LeaderboardEntry[] = sorted.map((entry, index) => ({
    rank: index + 1,
    profileId: entry.profileId,
    displayName: entry.displayName,
    totalPoints: entry.totalPoints,
    packsOpened: entry.packsOpened,
    accuracy: entry.totalPicks > 0 ? entry.correctPicks / entry.totalPicks : 0,
    isCurrentUser: anonymousId ? entry.anonymousId === anonymousId : false,
  }));

  let userRank: number | undefined;
  let userPoints: number | undefined;
  if (anonymousId) {
    const userEntry = ranked.find((e) => e.isCurrentUser);
    if (userEntry) {
      userRank = userEntry.rank;
      userPoints = userEntry.totalPoints;
    }
  }

  const paginated = ranked.slice(offset, offset + limit);

  return {
    entries: paginated,
    totalPlayers: ranked.length,
    userRank,
    userPoints,
  };
}

/**
 * Get or create the current week's leaderboard record.
 */
export async function getOrCreateWeeklyLeaderboard(): Promise<string | null> {
  const weekId = getCurrentWeekId();
  const weekStart = getCurrentWeekStart();
  const weekEnd = getCurrentWeekEnd();

  const { data: existing, error: selectError } = await supabase
    .from('leaderboards')
    .select('id')
    .eq('period_type', 'weekly')
    .eq('period_identifier', weekId)
    .single();

  if (existing && !selectError) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('leaderboards')
    .insert({
      period_type: 'weekly',
      period_identifier: weekId,
      starts_at: weekStart.toISOString(),
      ends_at: weekEnd.toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    const { data: retry } = await supabase
      .from('leaderboards')
      .select('id')
      .eq('period_type', 'weekly')
      .eq('period_identifier', weekId)
      .single();
    return retry?.id ?? null;
  }

  return created?.id ?? null;
}

/**
 * Update or create a leaderboard entry for a profile.
 */
export async function updateLeaderboardEntry(
  profileId: string,
  pointsToAdd: number,
  packsToAdd: number = 1,
  correctPicksToAdd: number = 0,
  totalPicksToAdd: number = 5
): Promise<boolean> {
  const leaderboardId = await getOrCreateWeeklyLeaderboard();
  if (!leaderboardId) {
    console.error('Failed to get or create weekly leaderboard');
    return false;
  }

  const { data: existing, error: selectError } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('leaderboard_id', leaderboardId)
    .eq('profile_id', profileId)
    .single();

  if (existing && !selectError) {
    const { error: updateError } = await supabase
      .from('leaderboard_entries')
      .update({
        total_points: (existing.total_points ?? 0) + pointsToAdd,
        packs_opened: (existing.packs_opened ?? 0) + packsToAdd,
        correct_picks: (existing.correct_picks ?? 0) + correctPicksToAdd,
        picks_made: (existing.picks_made ?? 0) + totalPicksToAdd,
        accuracy_rate:
          ((existing.correct_picks ?? 0) + correctPicksToAdd) /
          ((existing.picks_made ?? 0) + totalPicksToAdd),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating leaderboard entry:', updateError);
      return false;
    }
  } else {
    const { error: insertError } = await supabase
      .from('leaderboard_entries')
      .insert({
        leaderboard_id: leaderboardId,
        profile_id: profileId,
        total_points: pointsToAdd,
        packs_opened: packsToAdd,
        correct_picks: correctPicksToAdd,
        picks_made: totalPicksToAdd,
        accuracy_rate: totalPicksToAdd > 0 ? correctPicksToAdd / totalPicksToAdd : 0,
        rank: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error creating leaderboard entry:', insertError);
      return false;
    }
  }

  return true;
}
