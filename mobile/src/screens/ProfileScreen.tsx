import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { Header } from '../components/layout/Header';
import { PixelText } from '../components/common/PixelText';
import { PixelCard } from '../components/common/PixelCard';
import { PixelButton } from '../components/common/PixelButton';
import { ProfileStats } from '../components/game/ProfileStats';
import { WalletButton } from '../components/auth/WalletButton';
import { useSessionStore } from '../stores/session';
import { getOrCreateProfile } from '../lib/api/ProfileService';
import { getLeaderboard } from '../lib/api/LeaderboardService';
import { colors, spacing } from '../lib/theme';

export function ProfileScreen() {
  const profile = useSessionStore((s) => s.profile);
  const anonymousId = useSessionStore((s) => s.anonymousId);
  const isProfileSynced = useSessionStore((s) => s.isProfileSynced);
  const setProfile = useSessionStore((s) => s.setProfile);
  const setProfileId = useSessionStore((s) => s.setProfileId);
  const setProfileSynced = useSessionStore((s) => s.setProfileSynced);

  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync profile on mount
  useEffect(() => {
    if (!anonymousId) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await getOrCreateProfile(anonymousId);
        if (cancelled || !result) return;
        setProfileId(result.profileId);
        setProfile(result.profile);
        setProfileSynced(true);
      } catch (err) {
        console.error('Error syncing profile:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [anonymousId]);

  // Fetch weekly rank
  useEffect(() => {
    if (!anonymousId || !isProfileSynced) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await getLeaderboard(1, 0, anonymousId);
        if (!cancelled && data.userRank) {
          setWeeklyRank(data.userRank);
        }
      } catch (err) {
        console.error('Error fetching weekly rank:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [anonymousId, isProfileSynced]);

  const handleResetData = useCallback(() => {
    Alert.alert(
      'Reset All Data',
      'This will delete all your local packs and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowResetConfirm(false) },
        {
          text: 'Confirm Reset',
          style: 'destructive',
          onPress: () => {
            useSessionStore.getState().logout();
            setShowResetConfirm(false);
          },
        },
      ]
    );
  }, []);

  // Derived stats
  const totalPoints = profile?.total_points ?? 0;
  const packsOpened = profile?.total_packs_opened ?? 0;
  const correctPicks = profile?.total_correct_picks ?? 0;
  const totalPicks = profile?.total_picks_made ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const bestRank = profile?.best_weekly_rank;
  const accuracy =
    totalPicks > 0 ? ((correctPicks / totalPicks) * 100).toFixed(1) : '0';

  const displayName = profile?.display_name ?? profile?.username ?? 'Anonymous Player';

  return (
    <ScreenContainer>
      <Header />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Avatar & Name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <PixelText variant="body" size="4xl">{'👤'}</PixelText>
          </View>
          <PixelText variant="heading" size="lg" color={colors.foreground}>
            {displayName}
          </PixelText>
          <PixelText variant="body" size="sm" color={colors.textMuted}>
            ID: {anonymousId?.slice(0, 8)}...
          </PixelText>
          {!isProfileSynced && (
            <PixelText variant="body" size="sm" color={colors.game.warning}>
              Syncing profile...
            </PixelText>
          )}
        </View>

        {/* Main Stats: Total Points & Packs Opened */}
        <PixelCard style={styles.mainStatsCard}>
          <View style={styles.mainStatsRow}>
            <View style={styles.mainStat}>
              <PixelText variant="heading" size="2xl" color={colors.game.gold}>
                {totalPoints.toFixed(1)}
              </PixelText>
              <PixelText variant="body" size="sm" color={colors.textMuted}>
                Total Points
              </PixelText>
            </View>
            <View style={styles.mainStat}>
              <PixelText variant="heading" size="2xl" color={colors.foreground}>
                {String(packsOpened)}
              </PixelText>
              <PixelText variant="body" size="sm" color={colors.textMuted}>
                Packs Opened
              </PixelText>
            </View>
          </View>
        </PixelCard>

        {/* Accuracy & Streaks */}
        <ProfileStats
          stats={[
            { label: 'Accuracy', value: `${accuracy}%`, color: colors.foreground },
            { label: 'Current Streak', value: String(currentStreak), color: colors.foreground },
            { label: 'Correct Picks', value: `${correctPicks}/${totalPicks}`, color: colors.textMuted },
            { label: 'Longest Streak', value: String(longestStreak), color: colors.textMuted },
          ]}
        />

        {/* Best Performance */}
        <PixelCard style={styles.section}>
          <PixelText variant="heading" size="sm" color={colors.foreground} style={styles.sectionTitle}>
            Best Performance
          </PixelText>
          <View style={styles.perfRow}>
            <View>
              <PixelText variant="body" size="sm" color={colors.textMuted}>
                Best Weekly Rank
              </PixelText>
              <PixelText variant="heading" size="lg" color={colors.foreground}>
                {bestRank != null ? `#${bestRank}` : '—'}
              </PixelText>
            </View>
            <View style={styles.perfRight}>
              <PixelText variant="body" size="sm" color={colors.textMuted}>
                Current Week Rank
              </PixelText>
              <PixelText variant="heading" size="lg" color={colors.game.gold}>
                {weeklyRank != null ? `#${weeklyRank}` : '—'}
              </PixelText>
            </View>
          </View>
        </PixelCard>

        {/* Wallet Section */}
        <PixelCard style={styles.section}>
          <PixelText variant="heading" size="sm" color={colors.foreground} style={styles.sectionTitle}>
            Wallet
          </PixelText>
          <View style={styles.walletRow}>
            <WalletButton />
          </View>
        </PixelCard>

        {/* Developer Options */}
        <View style={styles.devSection}>
          <PixelText variant="body" size="sm" color={colors.textMuted} style={styles.devLabel}>
            Developer Options
          </PixelText>
          {!showResetConfirm ? (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setShowResetConfirm(true)}
            >
              <PixelText variant="body" size="base" color={colors.game.accent}>
                Reset All Data
              </PixelText>
            </TouchableOpacity>
          ) : (
            <View style={styles.resetConfirmRow}>
              <PixelButton
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setShowResetConfirm(false)}
                style={styles.resetBtn}
              />
              <PixelButton
                title="Confirm"
                variant="primary"
                size="sm"
                onPress={handleResetData}
                style={styles.resetBtn}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.game.secondary,
    borderWidth: 4,
    borderColor: colors.game.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  mainStatsCard: {
    marginBottom: spacing[3],
  },
  mainStatsRow: {
    flexDirection: 'row',
  },
  mainStat: {
    flex: 1,
    alignItems: 'center',
  },
  section: {
    marginTop: spacing[3],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  perfRight: {
    alignItems: 'flex-end',
  },
  walletRow: {
    alignItems: 'center',
  },
  devSection: {
    marginTop: spacing[8],
    paddingTop: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.card.border,
    alignItems: 'center',
  },
  devLabel: {
    marginBottom: spacing[3],
  },
  resetButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
    borderRadius: 8,
  },
  resetConfirmRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  resetBtn: {
    flex: 1,
  },
});
