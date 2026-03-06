import React, { useCallback } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PixelText } from '../common';
import { colors, spacing, borderRadius, shadows } from '../../lib/theme';
import { formatProbability, getTier, getTierColor } from '../../lib/scoring/calculator';
import { getEventRarity, getRarityConfig } from '../../lib/rarity';
import type { Event, Outcome } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SWIPE_X_THRESHOLD = 100;
const SWIPE_Y_THRESHOLD = 100;
const EXIT_X = 500;
const EXIT_Y = 500;
const MAX_ROTATION = 25;
const OVERLAY_ROTATION = 12;
const EXIT_DURATION = 200;

const COLOR_A = '#3b82f6';
const COLOR_B = '#ef4444';

const SUBCATEGORY_EMOJI: Record<string, string> = {
  nba: '\u{1F3C0}',
  nfl: '\u{1F3C8}',
  epl: '\u26BD',
  laliga: '\u26BD',
  ucl: '\u26BD',
  soccer: '\u26BD',
  f1: '\u{1F3CE}\uFE0F',
  mlb: '\u26BE',
  tennis: '\u{1F3BE}',
};
const DEFAULT_EMOJI = '\u{1F3AF}';

interface DraftPickerProps {
  event: Event;
  position: number;
  total: number;
  onPick: (outcome: Outcome) => void;
}

export function DraftPicker({ event, position, total, onPick }: DraftPickerProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const isExiting = useSharedValue(false);

  const rarity =
    event.rarityInfo?.rarity ??
    getEventRarity(event.outcome_a_probability, event.outcome_b_probability);
  const rarityConfig = getRarityConfig(rarity);

  const isVsMatch = event.outcome_a_label !== 'Yes' && event.outcome_b_label !== 'No';
  const subcategory = (event.subcategory ?? '').toLowerCase();
  const emoji = SUBCATEGORY_EMOJI[subcategory] ?? DEFAULT_EMOJI;

  const tierA = getTier(event.outcome_a_probability);
  const tierB = getTier(event.outcome_b_probability);
  const colorA = getTierColor(tierA);
  const colorB = getTierColor(tierB);

  const triggerPick = useCallback(
    (outcome: Outcome) => {
      onPick(outcome);
    },
    [onPick],
  );

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isExiting.value) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (isExiting.value) return;

      const absX = Math.abs(e.translationX);
      const absY = e.translationY; // positive = down

      // Check draw first (swipe down)
      if (event.supports_draw && absY > SWIPE_Y_THRESHOLD && absX < SWIPE_X_THRESHOLD) {
        isExiting.value = true;
        translateY.value = withTiming(EXIT_Y, { duration: EXIT_DURATION });
        cardOpacity.value = withTiming(0, { duration: EXIT_DURATION });
        runOnJS(triggerPick)('draw');
        return;
      }

      // Swipe right -> outcome A
      if (e.translationX > SWIPE_X_THRESHOLD) {
        isExiting.value = true;
        translateX.value = withTiming(EXIT_X, { duration: EXIT_DURATION });
        cardOpacity.value = withTiming(0, { duration: EXIT_DURATION });
        runOnJS(triggerPick)('a');
        return;
      }

      // Swipe left -> outcome B
      if (e.translationX < -SWIPE_X_THRESHOLD) {
        isExiting.value = true;
        translateX.value = withTiming(-EXIT_X, { duration: EXIT_DURATION });
        cardOpacity.value = withTiming(0, { duration: EXIT_DURATION });
        runOnJS(triggerPick)('b');
        return;
      }

      // Spring back
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  // Card transform
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-MAX_ROTATION, 0, MAX_ROTATION],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
      opacity: cardOpacity.value,
    };
  });

  // Overlay A (right swipe = blue)
  const overlayAStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_X_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Overlay B (left swipe = red)
  const overlayBStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, -SWIPE_X_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Overlay Draw (down swipe)
  const overlayDrawStyle = useAnimatedStyle(() => {
    if (!event.supports_draw) return { opacity: 0 };
    const opacity = interpolate(
      translateY.value,
      [0, SWIPE_Y_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View style={styles.container}>
      {/* Swipe hint labels behind the card */}
      <View style={styles.hintsContainer}>
        <View style={styles.hintLeft}>
          <PixelText variant="body" size="lg" color={COLOR_B}>
            {'\u2190 '}{event.outcome_b_label}
          </PixelText>
        </View>
        <View style={styles.hintRight}>
          <PixelText variant="body" size="lg" color={COLOR_A}>
            {event.outcome_a_label}{' \u2192'}
          </PixelText>
        </View>
      </View>

      {event.supports_draw && (
        <View style={styles.hintBottom}>
          <PixelText variant="body" size="lg" color={colors.game.gold}>
            {'\u2193 '}{event.outcome_draw_label || 'Draw'}
          </PixelText>
        </View>
      )}

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {/* ===== Overlays ===== */}
          <Animated.View style={[styles.overlay, styles.overlayA, overlayAStyle]}>
            <View style={styles.overlayLabelContainer}>
              <PixelText
                variant="heading"
                size="2xl"
                color={colors.white}
                style={styles.overlayLabelA}
              >
                {event.outcome_a_label}
              </PixelText>
            </View>
          </Animated.View>

          <Animated.View style={[styles.overlay, styles.overlayB, overlayBStyle]}>
            <View style={styles.overlayLabelContainer}>
              <PixelText
                variant="heading"
                size="2xl"
                color={colors.white}
                style={styles.overlayLabelB}
              >
                {event.outcome_b_label}
              </PixelText>
            </View>
          </Animated.View>

          {event.supports_draw && (
            <Animated.View style={[styles.overlay, styles.overlayDraw, overlayDrawStyle]}>
              <View style={styles.overlayLabelContainer}>
                <PixelText variant="heading" size="2xl" color={colors.white}>
                  {event.outcome_draw_label || 'Draw'}
                </PixelText>
              </View>
            </Animated.View>
          )}

          {/* ===== Image Area ===== */}
          <View style={styles.imageArea}>
            {/* Badges */}
            <View style={styles.badgesRow}>
              <View style={styles.badgesLeft}>
                <View style={styles.categoryBadge}>
                  <PixelText variant="heading" size="xs" color={colors.white} uppercase>
                    {event.subcategory || event.category}
                  </PixelText>
                </View>
                <View style={[styles.rarityBadge, { backgroundColor: rarityConfig.hex }]}>
                  <PixelText variant="heading" size="xs" color={colors.white} uppercase>
                    {rarityConfig.name}
                  </PixelText>
                </View>
              </View>
              <View style={styles.positionBadge}>
                <PixelText variant="body" size="lg" color={colors.white}>
                  {position}/{total}
                </PixelText>
              </View>
            </View>

            {/* Image or Emoji */}
            <View style={styles.imageContent}>
              {event.image_url ? (
                <Image
                  source={{ uri: event.image_url }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />
              ) : (
                <PixelText variant="body" size="4xl" style={styles.emojiText}>
                  {emoji}
                </PixelText>
              )}
            </View>

            {/* Gradient overlay at bottom of image */}
            <View style={styles.imageGradient} />
          </View>

          {/* ===== Info Section ===== */}
          <View style={styles.infoSection}>
            {/* Title */}
            <PixelText
              variant="body"
              size="xl"
              style={styles.title}
              numberOfLines={2}
            >
              {isVsMatch
                ? `${event.outcome_a_label} vs ${event.outcome_b_label}`
                : event.title}
            </PixelText>

            {/* Outcomes row */}
            <View style={styles.outcomesRow}>
              <View style={styles.outcomeItem}>
                <PixelText
                  variant="body"
                  size="xl"
                  color={COLOR_B}
                  numberOfLines={1}
                  style={styles.outcomeLabel}
                >
                  {event.outcome_b_label}
                </PixelText>
                <PixelText variant="body" size="lg" color={colorB}>
                  {formatProbability(event.outcome_b_probability)}
                </PixelText>
              </View>

              <PixelText variant="heading" size="base" color={colors.textMuted}>
                VS
              </PixelText>

              <View style={styles.outcomeItem}>
                <PixelText
                  variant="body"
                  size="xl"
                  color={COLOR_A}
                  numberOfLines={1}
                  style={styles.outcomeLabel}
                >
                  {event.outcome_a_label}
                </PixelText>
                <PixelText variant="body" size="lg" color={colorA}>
                  {formatProbability(event.outcome_a_probability)}
                </PixelText>
              </View>
            </View>

            {/* Draw info */}
            {event.supports_draw && event.outcome_draw_probability != null && (
              <PixelText
                variant="body"
                size="lg"
                color={colors.game.gold}
                style={styles.drawText}
              >
                {event.outcome_draw_label || 'Draw'}:{' '}
                {formatProbability(event.outcome_draw_probability)} {'\u2193'}
              </PixelText>
            )}

            {/* Swipe direction hints */}
            <View style={styles.swipeHintsRow}>
              <PixelText variant="body" size="base" color={COLOR_B}>
                {'\u2190 '}{event.outcome_b_label}
              </PixelText>
              <PixelText variant="body" size="base" color={COLOR_A}>
                {event.outcome_a_label}{' \u2192'}
              </PixelText>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Background hints
  hintsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  hintLeft: {
    alignItems: 'flex-start',
  },
  hintRight: {
    alignItems: 'flex-end',
  },
  hintBottom: {
    position: 'absolute',
    bottom: spacing[8],
    alignSelf: 'center',
  },

  // Card
  card: {
    width: SCREEN_WIDTH - spacing[8],
    backgroundColor: colors.card.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.card.border,
    overflow: 'hidden',
    ...shadows.pixel,
  },

  // Overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  overlayA: {
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
  },
  overlayB: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
  },
  overlayDraw: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  overlayLabelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLabelA: {
    transform: [{ rotate: `${OVERLAY_ROTATION}deg` }],
  },
  overlayLabelB: {
    transform: [{ rotate: `${-OVERLAY_ROTATION}deg` }],
  },

  // Image area
  imageArea: {
    height: 200,
    backgroundColor: colors.game.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgesRow: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 5,
  },
  badgesLeft: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  rarityBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  positionBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  imageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  emojiText: {
    fontSize: 80,
    lineHeight: 96,
    textAlign: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    // Simulated gradient using layered semi-transparent backgrounds
    backgroundColor: colors.card.bg,
    opacity: 0.7,
  },

  // Info section
  infoSection: {
    padding: spacing[4],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  outcomesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  outcomeItem: {
    flex: 1,
    alignItems: 'center',
  },
  outcomeLabel: {
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  drawText: {
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  swipeHintsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
  },
});
