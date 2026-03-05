import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { Header } from '../components/layout/Header';
import { PixelText, PixelButton, PixelCard } from '../components/common';
import { PackSprite } from '../components/game/PackSprite';
import { WeeklyStats } from '../components/game/WeeklyStats';
import { colors, spacing, borderRadius } from '../lib/theme';
import {
  useSessionStore,
  useProfile,
  useAnonymousId,
  useIsProfileSynced,
  usePackSummaries,
  useTotalPendingReveals,
} from '../stores';
import { checkAvailability, WEEKLY_PACK_LIMIT } from '../lib/api/PackService';
import type { WeeklyPackStatus } from '../lib/api/PackService';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';

type GameNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Game'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function GameScreen() {
  const navigation = useNavigation<GameNav>();
  const profile = useProfile();
  const anonymousId = useAnonymousId();
  const isProfileSynced = useIsProfileSynced();
  const packSummaries = usePackSummaries();
  const pendingReveals = useTotalPendingReveals();

  const [weeklyStatus, setWeeklyStatus] = useState<WeeklyPackStatus | null>(null);

  // Pulsing "Tap to Open" animation
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  // Compute local weekly count
  const localPacksThisWeek = (() => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);

    return packSummaries.filter((pack) => {
      const openedAt = new Date(pack.openedAt);
      return openedAt >= monday;
    }).length;
  })();

  // Fetch weekly pack status
  useEffect(() => {
    async function fetchWeeklyStatus() {
      if (!anonymousId || !isProfileSynced) return;
      try {
        const status = await checkAvailability(anonymousId);
        setWeeklyStatus(status);
      } catch (error) {
        console.error('Error fetching weekly status:', error);
      }
    }
    fetchWeeklyStatus();
  }, [anonymousId, isProfileSynced]);

  const weeklyLimit = weeklyStatus?.weeklyLimit ?? WEEKLY_PACK_LIMIT;
  const apiPacksOpened = weeklyStatus?.packsOpenedThisWeek ?? 0;
  const packsOpenedThisWeek = Math.max(localPacksThisWeek, apiPacksOpened);
  const packsRemaining = Math.max(0, weeklyLimit - packsOpenedThisWeek);

  // Active packs
  const activePacks = packSummaries.filter((p) => p.status !== 'completed');
  const previewPacks = activePacks.slice(0, 3);

  const weeklyPoints = profile?.total_points ?? 0;
  const weeklyRank = profile?.best_weekly_rank ?? '-';

  const handleOpenFreePack = useCallback(() => {
    if (packsRemaining > 0) {
      navigation.navigate('PackFlow', { screen: 'PackOpen' });
    }
  }, [navigation, packsRemaining]);

  const handleBuyPremiumPack = useCallback(() => {
    navigation.navigate('PackFlow', { screen: 'PackOpen' });
  }, [navigation]);

  const handleViewMyPacks = useCallback(() => {
    navigation.navigate('MyPacks');
  }, [navigation]);

  return (
    <ScreenContainer>
      <Header />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Stats */}
        <WeeklyStats
          totalPoints={weeklyPoints}
          packsOpened={profile?.total_packs_opened ?? 0}
          correctPicks={profile?.total_correct_picks ?? 0}
          totalPicks={profile?.total_picks_made ?? 0}
          currentStreak={profile?.current_streak ?? 0}
          weeklyRank={weeklyRank}
        />

        {/* Pack Display */}
        <View style={styles.packSection}>
          {/* Free Packs + Premium side by side */}
          <View style={styles.packRow}>
            {/* Free Packs */}
            <View style={styles.packColumn}>
              <PixelText
                variant="body"
                size="sm"
                color={colors.textMuted}
                uppercase
                style={styles.packLabel}
              >
                Free Packs
              </PixelText>

              <Pressable onPress={handleOpenFreePack} disabled={packsRemaining <= 0}>
                <View style={styles.packDisplay}>
                  {packsRemaining >= 2 ? (
                    <View style={styles.stackedPacks}>
                      <View style={styles.backPack}>
                        <PackSprite size="md" glowing={false} />
                      </View>
                      <View style={styles.frontPack}>
                        <PackSprite size="md" glowing={packsRemaining > 0} />
                      </View>
                    </View>
                  ) : packsRemaining === 1 ? (
                    <PackSprite size="md" glowing />
                  ) : (
                    <PackSprite size="md" disabled />
                  )}
                </View>
              </Pressable>

              {/* Status text */}
              <View style={styles.packStatusRow}>
                <PixelText
                  variant="body"
                  size="sm"
                  color={packsRemaining > 0 ? colors.game.success : colors.textMuted}
                >
                  {packsRemaining}/{weeklyLimit} remaining
                </PixelText>
              </View>

              {packsRemaining > 0 && (
                <Animated.View style={{ opacity: pulseAnim }}>
                  <PixelText variant="body" size="sm" color={colors.foreground}>
                    Tap to Open
                  </PixelText>
                </Animated.View>
              )}
              {packsRemaining <= 0 && (
                <PixelText variant="body" size="xs" color={colors.textMuted}>
                  Resets Monday
                </PixelText>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Premium Pack */}
            <View style={styles.packColumn}>
              <PixelText
                variant="body"
                size="sm"
                color={colors.game.gold}
                uppercase
                style={styles.packLabel}
              >
                Premium
              </PixelText>

              <Pressable onPress={handleBuyPremiumPack}>
                <View style={styles.packDisplay}>
                  <PackSprite size="md" premium glowing />
                </View>
              </Pressable>

              <Pressable onPress={handleBuyPremiumPack} style={styles.priceBadge}>
                <PixelText variant="heading" size="xs" color={colors.black}>
                  100 $PLAY
                </PixelText>
              </Pressable>
            </View>
          </View>

          <PixelText
            variant="body"
            size="sm"
            color={colors.textMuted}
            style={styles.packCaption}
          >
            5 events - Make your picks - Win USD
          </PixelText>
        </View>

        {/* Active Packs */}
        {activePacks.length > 0 && (
          <View style={styles.activeSection}>
            <View style={styles.activeSectionHeader}>
              <PixelText variant="body" size="base" color={colors.textMuted}>
                Games in progress
              </PixelText>
              {pendingReveals > 0 && (
                <PixelText variant="body" size="base" color={colors.game.gold}>
                  {pendingReveals} ready!
                </PixelText>
              )}
            </View>

            {previewPacks.map((pack) => (
              <Pressable
                key={pack.id}
                onPress={() =>
                  navigation.navigate('PackFlow', {
                    screen: 'PackDetail',
                    params: { packId: pack.id },
                  })
                }
              >
                <PixelCard style={styles.activePackCard}>
                  <View style={styles.activePackRow}>
                    <View style={styles.activePackInfo}>
                      <PixelText variant="body" size="base" color={colors.foreground}>
                        {pack.isPremium ? 'Premium Pack' : 'Free Pack'}
                      </PixelText>
                      <PixelText variant="body" size="xs" color={colors.textMuted}>
                        {pack.resolvedCount}/{pack.totalPicks} resolved
                      </PixelText>
                    </View>
                    <View style={styles.activePackPoints}>
                      <PixelText variant="heading" size="sm" color={colors.game.gold}>
                        {pack.totalPoints}
                      </PixelText>
                      <PixelText variant="body" size="xs" color={colors.textMuted}>
                        pts
                      </PixelText>
                    </View>
                    {/* Status indicator */}
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            pack.status === 'has_reveals'
                              ? colors.game.gold
                              : pack.status === 'waiting'
                                ? colors.game.warning
                                : colors.game.success,
                        },
                      ]}
                    />
                  </View>
                </PixelCard>
              </Pressable>
            ))}

            {activePacks.length > previewPacks.length && (
              <Pressable onPress={handleViewMyPacks}>
                <PixelText
                  variant="body"
                  size="base"
                  color={colors.game.accent}
                  style={styles.viewMoreText}
                >
                  View {activePacks.length - previewPacks.length} more...
                </PixelText>
              </Pressable>
            )}
          </View>
        )}

        {/* Pack history link */}
        {activePacks.length === 0 && packSummaries.length > 0 && (
          <Pressable onPress={handleViewMyPacks} style={styles.historyLink}>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              View pack history →
            </PixelText>
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
    gap: spacing[6],
  },
  // Pack section
  packSection: {
    alignItems: 'center',
  },
  packRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
  },
  packColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
  },
  packLabel: {
    marginBottom: spacing[2],
    letterSpacing: 2,
  },
  packDisplay: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedPacks: {
    position: 'relative',
    width: 140,
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backPack: {
    position: 'absolute',
    transform: [{ rotate: '8deg' }, { translateX: 15 }],
    opacity: 0.7,
  },
  frontPack: {
    position: 'absolute',
    transform: [{ rotate: '-8deg' }, { translateX: -15 }],
    zIndex: 1,
  },
  packStatusRow: {
    marginTop: spacing[1],
  },
  divider: {
    width: 1,
    height: 180,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  priceBadge: {
    backgroundColor: colors.game.gold,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginTop: spacing[1],
  },
  packCaption: {
    marginTop: spacing[4],
    textAlign: 'center',
  },
  // Active packs
  activeSection: {
    gap: spacing[2],
  },
  activeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  activePackCard: {
    padding: spacing[3],
  },
  activePackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePackInfo: {
    flex: 1,
    gap: 2,
  },
  activePackPoints: {
    alignItems: 'center',
    marginRight: spacing[3],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewMoreText: {
    textAlign: 'center',
    paddingVertical: spacing[2],
  },
  historyLink: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
});
