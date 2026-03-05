import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { PixelText } from '../common';
import { colors, spacing, borderRadius, borderWidth } from '../../lib/theme';
import { formatProbability } from '../../lib/scoring/calculator';
import type { UserPick, Event } from '../../types';

interface RevealCardProps {
  pick: UserPick & { event: Event };
  onRevealComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function RevealCard({ pick, onRevealComplete }: RevealCardProps) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const pickedLabel =
    pick.picked_outcome === 'a'
      ? pick.event.outcome_a_label
      : pick.picked_outcome === 'b'
        ? pick.event.outcome_b_label
        : pick.event.outcome_draw_label || 'Draw';

  const pickedProbability =
    pick.picked_outcome === 'a'
      ? pick.event.outcome_a_probability
      : pick.picked_outcome === 'b'
        ? pick.event.outcome_b_probability
        : pick.event.outcome_draw_probability ?? 0;

  useEffect(() => {
    // Entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Flip after a short delay
    const flipTimer = setTimeout(() => {
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        // Show result after flip
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Complete after showing result
          setTimeout(onRevealComplete, 1200);
        });
      });
    }, 500);

    return () => clearTimeout(flipTimer);
  }, [flipAnim, scaleAnim, resultOpacity, onRevealComplete]);

  // Front side rotates from 0 to 90 degrees (first half)
  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5],
    outputRange: [1, 1, 0],
  });

  // Back side rotates from -90 to 0 degrees (second half)
  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '-90deg', '0deg'],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5],
    outputRange: [0, 0, 1],
  });

  const isCorrect = pick.is_correct;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
        {/* Front (question side) */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFront,
            {
              opacity: frontOpacity,
              transform: [{ perspective: 1000 }, { rotateY: frontRotateY }],
            },
          ]}
        >
          <View style={styles.positionBadge}>
            <PixelText variant="heading" size="base" color={colors.black}>
              #{pick.position}
            </PixelText>
          </View>

          <View style={styles.categoryBadge}>
            <PixelText variant="heading" size="xs" uppercase color={colors.white}>
              {pick.event.subcategory || pick.event.category}
            </PixelText>
          </View>

          <PixelText variant="body" size="xl" style={styles.eventTitle} numberOfLines={3}>
            {pick.event.title}
          </PixelText>

          <View style={styles.pickInfo}>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              Your pick:
            </PixelText>
            <PixelText variant="body" size="xl" color={colors.game.accent}>
              {pickedLabel}
            </PixelText>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              @ {formatProbability(pickedProbability)}
            </PixelText>
          </View>
        </Animated.View>

        {/* Back (result side) */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            isCorrect ? styles.cardCorrect : styles.cardIncorrect,
            {
              opacity: backOpacity,
              transform: [{ perspective: 1000 }, { rotateY: backRotateY }],
            },
          ]}
        >
          <Animated.View style={[styles.resultContent, { opacity: resultOpacity }]}>
            <PixelText variant="body" size="4xl">
              {isCorrect ? '✓' : '✗'}
            </PixelText>

            <PixelText
              variant="heading"
              size="xl"
              color={isCorrect ? colors.game.success : colors.game.failure}
              style={styles.resultLabel}
            >
              {isCorrect ? 'CORRECT!' : 'WRONG'}
            </PixelText>

            <PixelText variant="body" size="lg" color={colors.textMuted} style={styles.eventTitleSmall}>
              {pickedLabel}
            </PixelText>

            {isCorrect && pick.points_awarded > 0 && (
              <PixelText variant="heading" size="2xl" color={colors.game.gold} style={styles.points}>
                +${pick.points_awarded.toFixed(2)}
              </PixelText>
            )}

            {!isCorrect && (
              <PixelText variant="body" size="lg" color={colors.game.failure} style={styles.points}>
                +$0.00
              </PixelText>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: borderWidth.thick,
    padding: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: colors.card.bg,
    borderColor: colors.card.border,
  },
  cardBack: {
    borderColor: colors.card.border,
  },
  cardCorrect: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: colors.game.success,
  },
  cardIncorrect: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: colors.game.failure,
  },
  positionBadge: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.game.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: colors.game.secondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  eventTitle: {
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  pickInfo: {
    alignItems: 'center',
    gap: spacing[1],
  },
  resultContent: {
    alignItems: 'center',
  },
  resultLabel: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  eventTitleSmall: {
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  points: {
    marginTop: spacing[2],
  },
});
