import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { Header } from '../components/layout/Header';
import { GameBackground } from '../components/game/GameBackground';
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

import type { RootStackParamList, MainTabParamList } from '../navigation/types';

const usdcLogo = require('../../assets/images/usdc-logo.png');

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



  // Active packs
  const activePacks = packSummaries.filter((p) => p.status !== 'completed');
  const previewPacks = activePacks.slice(0, 3);

  const handleOpenFreePack = useCallback(() => {
    navigation.navigate('PackFlow', { screen: 'PackOpen' });
  }, [navigation]);

  const handleBuyPremiumPack = useCallback(() => {
    navigation.navigate('PackFlow', { screen: 'PremiumPack' });
  }, [navigation]);

  const handleViewMyPacks = useCallback(() => {
    navigation.navigate('MyPacks');
  }, [navigation]);

  return (
    <ScreenContainer>
      <GameBackground />
      <Header />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Stats */}
        <WeeklyStats
          packsOpened={profile?.total_packs_opened ?? 0}
          correctPicks={profile?.total_correct_picks ?? 0}
          currentStreak={profile?.current_streak ?? 0}
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

              <Pressable onPress={handleOpenFreePack}>
                <View style={styles.packDisplay}>
                  <View style={styles.stackedPacks}>
                    <View style={styles.backPack}>
                      <PackSprite size="lg" />
                    </View>
                    <View style={styles.frontPack}>
                      <PackSprite size="lg" />
                    </View>
                  </View>
                </View>
              </Pressable>

              <Animated.View style={{ opacity: pulseAnim }}>
                <PixelText variant="body" size="sm" color={colors.foreground}>
                  Tap to Open
                </PixelText>
              </Animated.View>
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
                  <PackSprite size="lg" premium />
                </View>
              </Pressable>

              <Pressable onPress={handleBuyPremiumPack} style={styles.priceBadge}>
                <Image source={usdcLogo} style={{ width: 20, height: 20 }} />
                <PixelText variant="heading" size="xs" color={colors.black}>
                  1 USDC
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
              <View style={styles.activeSectionTitleRow}>
                <PixelText variant="heading" size="base" color={colors.foreground}>
                  In Progress
                </PixelText>
                <View style={styles.countBadge}>
                  <PixelText variant="heading" size="xs" color={colors.black}>
                    {activePacks.length}
                  </PixelText>
                </View>
              </View>
              {pendingReveals > 0 && (
                <View style={styles.revealsBadge}>
                  <PixelText variant="heading" size="xs" color={colors.black}>
                    {pendingReveals} READY!
                  </PixelText>
                </View>
              )}
            </View>

            {previewPacks.map((pack) => {
              const statusColor =
                pack.status === 'has_reveals'
                  ? colors.game.gold
                  : pack.status === 'drafting'
                    ? colors.game.success
                    : colors.game.warning;
              const statusLabel =
                pack.status === 'has_reveals'
                  ? 'REVEAL READY'
                  : pack.status === 'drafting'
                    ? 'DRAFTING'
                    : pack.status === 'waiting'
                      ? 'WAITING'
                      : 'IN PROGRESS';
              const progressPct =
                pack.totalPicks > 0
                  ? (pack.resolvedCount / pack.totalPicks) * 100
                  : 0;

              return (
                <Pressable
                  key={pack.id}
                  onPress={() =>
                    navigation.navigate('PackFlow', {
                      screen: 'PackDetail',
                      params: { packId: pack.id },
                    })
                  }
                >
                  <View
                    style={[
                      styles.activePackCard,
                      { borderColor: `${statusColor}44` },
                    ]}
                  >
                    {/* Top row: sprite + title/points + arrow */}
                    <View style={styles.activePackTopRow}>
                      <View style={styles.activePackSpriteWrap}>
                        <PackSprite size="sm" premium={pack.isPremium} />
                      </View>

                      <View style={styles.activePackInfo}>
                        <PixelText variant="heading" size="sm" color={colors.foreground}>
                          {pack.isPremium ? 'Premium Pack' : 'Sports Pack'}
                        </PixelText>
                        <View style={styles.activePackPointsRow}>
                          <PixelText variant="heading" size="base" color={colors.game.gold}>
                            {pack.totalPoints}
                          </PixelText>
                          <PixelText variant="body" size="xs" color={colors.textMuted}>
                            {' '}pts
                          </PixelText>
                        </View>
                      </View>

                      <PixelText variant="heading" size="lg" color={colors.textMuted}>
                        {'\u2192'}
                      </PixelText>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBarOuter}>
                      <View
                        style={[
                          styles.progressBarInner,
                          {
                            width: `${Math.max(progressPct, 4)}%`,
                            backgroundColor: statusColor,
                          },
                        ]}
                      />
                      <View style={styles.progressBarLabel}>
                        <PixelText variant="body" size="xs" color={colors.foreground}>
                          {pack.resolvedCount}/{pack.totalPicks}
                        </PixelText>
                      </View>
                    </View>

                    {/* Pick chips */}
                    <View style={styles.pickChipsRow}>
                      {pack.pickPreviews.map((pick) => {
                        const chipBorderColor = pick.isResolved
                          ? pick.isCorrect
                            ? colors.game.success
                            : colors.game.failure
                          : colors.rarity.common;
                        const abbrev =
                          pick.pickedLabel.length > 3
                            ? pick.pickedLabel.substring(0, 3).toUpperCase()
                            : pick.pickedLabel.toUpperCase();
                        return (
                          <View
                            key={pick.eventId}
                            style={[
                              styles.pickChip,
                              { borderColor: chipBorderColor },
                            ]}
                          >
                            <PixelText variant="body" size="xs" color={colors.foreground}>
                              {abbrev}{pick.isResolved ? '' : '?'}
                            </PixelText>
                          </View>
                        );
                      })}
                    </View>

                    {/* Status badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusColor}22`, borderColor: statusColor },
                      ]}
                    >
                      <View
                        style={[styles.statusBadgeDot, { backgroundColor: statusColor }]}
                      />
                      <PixelText variant="body" size="xs" color={statusColor}>
                        {statusLabel}
                      </PixelText>
                    </View>
                  </View>
                </Pressable>
              );
            })}

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
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[20],
    gap: spacing[4],
    flexGrow: 1,
  },
  // Pack section
  packSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedPacks: {
    position: 'relative',
    width: 180,
    height: 220,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backPack: {
    position: 'absolute',
    transform: [{ rotate: '10deg' }, { translateX: 20 }],
    opacity: 0.75,
  },
  frontPack: {
    position: 'absolute',
    transform: [{ rotate: '-8deg' }, { translateX: -20 }],
    zIndex: 1,
  },
  divider: {
    width: 1,
    height: 240,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  priceBadge: {
    backgroundColor: colors.game.gold,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginTop: spacing[1],
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
  },
  packCaption: {
    marginTop: spacing[4],
    textAlign: 'center',
  },
  // Active packs
  activeSection: {
    gap: spacing[3],
  },
  activeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  activeSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  countBadge: {
    backgroundColor: colors.game.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 22,
    alignItems: 'center',
  },
  revealsBadge: {
    backgroundColor: colors.game.gold,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePackCard: {
    backgroundColor: '#151528',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: spacing[3],
    gap: spacing[2],
  },
  activePackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  activePackSpriteWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePackInfo: {
    flex: 1,
    gap: 2,
  },
  activePackPointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressBarOuter: {
    height: 14,
    backgroundColor: '#0a0a1a',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    overflow: 'hidden',
    position: 'relative' as const,
    justifyContent: 'center',
  },
  progressBarInner: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  progressBarLabel: {
    position: 'absolute' as const,
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  pickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickChip: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#1a1a32',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
