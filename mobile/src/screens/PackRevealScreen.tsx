import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText, PixelButton, PixelCard } from '../components/common';
import { RevealCard } from '../components/game/RevealCard';
import { PackSummary } from '../components/game/PackSummary';
import { ProgressDots } from '../components/game/ProgressDots';
import { useMyPacksStore, useStoredPack } from '../stores/myPacks';
import { formatProbability } from '../lib/scoring/calculator';
import { colors, spacing, borderRadius, borderWidth } from '../lib/theme';
import type { PackStackParamList, RootStackParamList } from '../navigation/types';
import type { UserPick, Event } from '../types';

type NavProp = NativeStackNavigationProp<PackStackParamList & RootStackParamList, 'PackReveal'>;
type RevealRoute = RouteProp<PackStackParamList, 'PackReveal'>;

export function PackRevealScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RevealRoute>();
  const { packId } = route.params;

  const storedPack = useStoredPack(packId);
  const updatePick = useMyPacksStore((s) => s.updatePick);

  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealingPick, setRevealingPick] = useState<(UserPick & { event: Event }) | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Get sorted picks
  const picks = storedPack
    ? [...storedPack.picks].sort((a, b) => a.position - b.position)
    : [];

  // Calculate running total from revealed picks
  const revealedPicks = picks.filter((p) => p.reveal_animation_played);
  const totalPoints = revealedPicks.reduce((sum, p) => sum + p.points_awarded, 0);
  const correctCount = revealedPicks.filter((p) => p.is_correct).length;

  // Auto-reveal: start revealing the next pick once available
  useEffect(() => {
    if (isRevealing || showSummary || picks.length === 0) return;

    if (currentRevealIndex >= picks.length) {
      // All revealed, show summary after delay
      const timer = setTimeout(() => setShowSummary(true), 600);
      return () => clearTimeout(timer);
    }

    // Auto-start next reveal after a brief pause
    const pick = picks[currentRevealIndex];
    if (pick && !pick.reveal_animation_played) {
      const timer = setTimeout(() => {
        setRevealingPick(pick);
        setIsRevealing(true);
      }, currentRevealIndex === 0 ? 500 : 800);
      return () => clearTimeout(timer);
    }
  }, [currentRevealIndex, isRevealing, showSummary, picks]);

  // Handle reveal completion
  const handleRevealComplete = useCallback(() => {
    if (!revealingPick) return;

    // Mark pick as revealed in store
    updatePick(packId, revealingPick.id, { reveal_animation_played: true });

    setIsRevealing(false);
    setRevealingPick(null);
    setCurrentRevealIndex((prev) => prev + 1);
  }, [packId, revealingPick, updatePick]);

  // Navigate to pack detail
  const handleViewPack = useCallback(() => {
    setShowSummary(false);
    navigation.replace('PackDetail', { packId });
  }, [navigation, packId]);

  // Navigate back to game
  const handleBackToGame = useCallback(() => {
    setShowSummary(false);
    navigation.getParent()?.navigate('MainTabs', { screen: 'Game' });
  }, [navigation]);

  if (!storedPack) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <PixelText variant="body" size="lg" color={colors.textMuted}>
            Pack not found
          </PixelText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <PixelText variant="heading" size="base" color={colors.game.gold}>
            REVEALING PICKS
          </PixelText>
          <ProgressDots
            total={picks.length}
            current={currentRevealIndex}
            completedCount={revealedPicks.length}
          />
        </View>

        {/* Running total */}
        <View style={styles.totalBar}>
          <View style={styles.totalItem}>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              Revealed
            </PixelText>
            <PixelText variant="body" size="xl">
              {revealedPicks.length}/{picks.length}
            </PixelText>
          </View>
          <View style={styles.totalItem}>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              Correct
            </PixelText>
            <PixelText variant="body" size="xl" color={colors.game.success}>
              {correctCount}
            </PixelText>
          </View>
          <View style={styles.totalItem}>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              USD
            </PixelText>
            <PixelText variant="body" size="xl" color={colors.game.gold}>
              ${totalPoints.toFixed(2)}
            </PixelText>
          </View>
        </View>

        {/* Pick list */}
        <View style={styles.picksList}>
          {picks.map((pick, index) => {
            const isRevealed = pick.reveal_animation_played;
            const isCurrent = index === currentRevealIndex;
            const isPending = index > currentRevealIndex;

            const pickedLabel =
              pick.picked_outcome === 'a'
                ? pick.event.outcome_a_label
                : pick.picked_outcome === 'b'
                  ? pick.event.outcome_b_label
                  : pick.event.outcome_draw_label || 'Draw';

            return (
              <PixelCard
                key={pick.id}
                variant={isRevealed ? (pick.is_correct ? 'highlight' : 'default') : 'default'}
                style={[
                  styles.pickCard,
                  isCurrent && styles.pickCardCurrent,
                  isPending && styles.pickCardPending,
                  isRevealed && pick.is_correct && styles.pickCardCorrect,
                  isRevealed && !pick.is_correct && styles.pickCardIncorrect,
                ]}
              >
                <View style={styles.pickRow}>
                  {/* Position */}
                  <View
                    style={[
                      styles.positionBadge,
                      isRevealed
                        ? pick.is_correct
                          ? styles.positionCorrect
                          : styles.positionIncorrect
                        : isCurrent
                          ? styles.positionActive
                          : styles.positionPending,
                    ]}
                  >
                    <PixelText
                      variant="heading"
                      size="xs"
                      color={isRevealed || isCurrent ? colors.black : colors.white}
                    >
                      {isRevealed ? (pick.is_correct ? '✓' : '✗') : `${index + 1}`}
                    </PixelText>
                  </View>

                  {/* Info */}
                  <View style={styles.pickInfo}>
                    <PixelText
                      variant="body"
                      size="lg"
                      numberOfLines={1}
                      color={isPending ? colors.textMuted : colors.foreground}
                    >
                      {pick.event.title}
                    </PixelText>
                    <View style={styles.pickMeta}>
                      <PixelText variant="body" size="base" color={colors.textMuted}>
                        {pickedLabel}
                      </PixelText>
                      <PixelText variant="body" size="base" color={colors.textMuted}>
                        @ {formatProbability(pick.probability_snapshot)}
                      </PixelText>
                    </View>
                  </View>

                  {/* Result */}
                  {isRevealed && (
                    <View style={styles.pickResult}>
                      {pick.is_correct ? (
                        <PixelText variant="body" size="lg" color={colors.game.gold}>
                          +${pick.points_awarded.toFixed(2)}
                        </PixelText>
                      ) : (
                        <PixelText variant="body" size="base" color={colors.game.failure}>
                          $0.00
                        </PixelText>
                      )}
                    </View>
                  )}

                  {/* Pending state */}
                  {isPending && (
                    <PixelText variant="body" size="base" color={colors.textMuted}>
                      ...
                    </PixelText>
                  )}
                </View>
              </PixelCard>
            );
          })}
        </View>

        {/* Reveal Animation Overlay */}
        {isRevealing && revealingPick && (
          <RevealCard pick={revealingPick} onRevealComplete={handleRevealComplete} />
        )}

        {/* Summary Overlay */}
        {showSummary && (
          <PackSummary
            correctCount={correctCount}
            totalPicks={picks.length}
            totalPoints={totalPoints}
            onViewPack={handleViewPack}
            onBackToGame={handleBackToGame}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.card.border,
    marginBottom: spacing[3],
  },
  totalItem: {
    alignItems: 'center',
  },
  picksList: {
    flex: 1,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  pickCard: {
    padding: spacing[3],
  },
  pickCardCurrent: {
    borderColor: colors.game.gold,
  },
  pickCardPending: {
    opacity: 0.5,
  },
  pickCardCorrect: {
    borderColor: colors.game.success,
  },
  pickCardIncorrect: {
    borderColor: colors.game.failure,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionCorrect: {
    backgroundColor: colors.game.success,
  },
  positionIncorrect: {
    backgroundColor: colors.game.failure,
  },
  positionActive: {
    backgroundColor: colors.game.gold,
  },
  positionPending: {
    backgroundColor: colors.game.secondary,
  },
  pickInfo: {
    flex: 1,
  },
  pickMeta: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: 2,
  },
  pickResult: {
    alignItems: 'flex-end',
  },
});
