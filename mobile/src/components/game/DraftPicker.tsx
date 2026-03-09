import React, { useCallback, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Pressable, Animated as RNAnimated, Easing as RNEasing } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PixelText } from '../common';
import { haptic } from '../../lib/haptics';
import { playSound } from '../../lib/audio';
import { colors, spacing, borderRadius, shadows } from '../../lib/theme';
import { formatProbability, getTier, getTierColor } from '../../lib/scoring/calculator';
import { getEventRarity, getRarityConfig } from '../../lib/rarity';
import type { Event, Outcome } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SWIPE_X_THRESHOLD = 80;
const SWIPE_Y_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;
const EXIT_X = 500;
const EXIT_Y = 500;
const MAX_ROTATION = 20;
const OVERLAY_ROTATION = 12;
const EXIT_DURATION = 200;

const COLOR_A = '#3b82f6';
const COLOR_B = '#ef4444';
const COLOR_DRAW = '#ffd700';

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

// Card dimensions - dominate the screen like Balatro jokers
const CARD_WIDTH = SCREEN_WIDTH - spacing[4] * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;

interface DraftPickerProps {
  event: Event;
  position: number;
  total: number;
  onPick: (outcome: Outcome) => void;
}

function PickButton({
  label,
  color,
  onPress,
  direction,
}: {
  label: string;
  color: string;
  onPress: () => void;
  direction: 'left' | 'right' | 'down';
}) {
  const translateY = useRef(new RNAnimated.Value(0)).current;

  const arrow = direction === 'left' ? '\u2190 ' : direction === 'right' ? ' \u2192' : '\u2195 ';
  const short = label.length > 12 ? label.slice(0, 11) + '.' : label;
  const displayText = direction === 'left' ? arrow + short : direction === 'down' ? arrow + short : short + arrow;

  const handlePressIn = () => {
    playSound('nav_tick');
    RNAnimated.timing(translateY, {
      toValue: 3,
      duration: 50,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.timing(translateY, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.pickButtonWrap}>
      {/* Pixel shadow layer */}
      <View style={[styles.pickButtonShadow, { backgroundColor: color + '40' }]} />
      {/* Button face */}
      <RNAnimated.View
        style={[
          styles.pickButton,
          {
            backgroundColor: color,
            transform: [{ translateY }],
          },
        ]}
      >
        <PixelText variant="heading" size="xs" color="#fff" numberOfLines={1}>
          {displayText}
        </PixelText>
      </RNAnimated.View>
    </Pressable>
  );
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

  const triggerPick = useCallback(
    (outcome: Outcome) => {
      haptic('heavy');
      playSound('focus_pop');
      onPick(outcome);
    },
    [onPick],
  );

  // Foil / Holo shimmer for rare+ cards
  const hasShimmer = rarity === 'rare' || rarity === 'epic' || rarity === 'legendary';
  const isHolo = rarity === 'legendary';
  const shimmerX = useSharedValue(-SCREEN_WIDTH);

  useEffect(() => {
    if (!hasShimmer) return;
    const duration = isHolo ? 2500 : 3500;
    shimmerX.value = -SCREEN_WIDTH;
    shimmerX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [hasShimmer, isHolo]);

  const foilShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const holoShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isExiting.value) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (isExiting.value) return;

      const absX = Math.abs(e.translationX);
      const absY = e.translationY;
      const velX = Math.abs(e.velocityX);
      const velY = Math.abs(e.velocityY);

      const passedX = absX > SWIPE_X_THRESHOLD || velX > VELOCITY_THRESHOLD;
      const passedY = absY > SWIPE_Y_THRESHOLD || velY > VELOCITY_THRESHOLD;

      // Draw (swipe down OR up)
      if (event.supports_draw && passedY && absX < SWIPE_X_THRESHOLD) {
        isExiting.value = true;
        const exitDirection = e.translationY > 0 ? EXIT_Y : -EXIT_Y;
        translateY.value = withTiming(exitDirection, { duration: EXIT_DURATION });
        cardOpacity.value = withTiming(0, { duration: EXIT_DURATION });
        runOnJS(triggerPick)('draw');

        return;
      }

      // Horizontal swipe
      if (absX > Math.abs(e.translationY)) {
        if (passedX) {
          isExiting.value = true;
          if (e.translationX < 0) {
            // Swipe left -> outcome A (left team)
            translateX.value = withTiming(-EXIT_X, { duration: EXIT_DURATION });
            cardOpacity.value = withTiming(0, { duration: EXIT_DURATION });
            runOnJS(triggerPick)('a');
    
          } else {
            // Swipe right -> outcome B (right team)
            translateX.value = withTiming(EXIT_X, { duration: EXIT_DURATION });
            cardOpacity.value = withTiming(0, { duration: EXIT_DURATION });
            runOnJS(triggerPick)('b');
    
          }
          return;
        }
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

  // Overlay A (swipe left = picks A)
  const overlayAStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, -SWIPE_X_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Overlay B (swipe right = picks B)
  const overlayBStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_X_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Overlay Draw (swipe down OR up)
  const overlayDrawStyle = useAnimatedStyle(() => {
    if (!event.supports_draw) return { opacity: 0 };
    const absY = Math.abs(translateY.value);
    const opacity = interpolate(
      absY,
      [0, SWIPE_Y_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, { borderColor: rarityConfig.hex + '80' }, cardAnimatedStyle]}>
          {/* ===== Overlays ===== */}
          <Animated.View style={[styles.overlay, styles.overlayA, overlayAStyle]}>
            <View style={styles.overlayLabelContainer}>
              <PixelText variant="heading" size="2xl" color={colors.white} style={styles.overlayLabelA}>
                {event.outcome_a_label}
              </PixelText>
            </View>
          </Animated.View>

          <Animated.View style={[styles.overlay, styles.overlayB, overlayBStyle]}>
            <View style={styles.overlayLabelContainer}>
              <PixelText variant="heading" size="2xl" color={colors.white} style={styles.overlayLabelB}>
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

          {/* ===== Shimmer ===== */}
          {hasShimmer && !isHolo && (
            <View style={styles.shimmerContainer} pointerEvents="none">
              <Animated.View style={[styles.foilBand, foilShimmerStyle]} />
            </View>
          )}
          {hasShimmer && isHolo && (
            <View style={styles.shimmerContainer} pointerEvents="none">
              <Animated.View style={[styles.holoBands, holoShimmerStyle]}>
                <View style={[styles.holoBand, { backgroundColor: 'rgba(255, 215, 0, 0.18)' }]} />
                <View style={[styles.holoBand, { backgroundColor: 'rgba(59, 130, 246, 0.16)' }]} />
                <View style={[styles.holoBand, { backgroundColor: 'rgba(168, 85, 247, 0.16)' }]} />
                <View style={[styles.holoBand, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]} />
              </Animated.View>
            </View>
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
          </View>

          {/* ===== Info Section (inside card) ===== */}
          <View style={styles.infoSection}>
            <PixelText variant="body" size="xl" style={styles.title} numberOfLines={2}>
              {isVsMatch
                ? `${event.outcome_a_label} vs ${event.outcome_b_label}`
                : event.title}
            </PixelText>

            {/* Probabilities row */}
            <View style={styles.outcomesRow}>
              <View style={styles.outcomeItem}>
                <PixelText variant="body" size="xl" color={COLOR_A} numberOfLines={1}>
                  {formatProbability(event.outcome_a_probability)}
                </PixelText>
              </View>
              {event.supports_draw && event.outcome_draw_probability != null && (
                <PixelText variant="body" size="lg" color={COLOR_DRAW}>
                  {formatProbability(event.outcome_draw_probability)}
                </PixelText>
              )}
              <View style={styles.outcomeItem}>
                <PixelText variant="body" size="xl" color={COLOR_B} numberOfLines={1}>
                  {formatProbability(event.outcome_b_probability)}
                </PixelText>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Pick buttons OUTSIDE the card, below it */}
      <View style={styles.pickButtonsRow}>
        <PickButton
          label={event.outcome_a_label}
          color={COLOR_A}
          onPress={() => triggerPick('a')}
          direction="left"
        />
        {event.supports_draw && (
          <PickButton
            label={event.outcome_draw_label || 'Draw'}
            color={COLOR_DRAW}
            onPress={() => triggerPick('draw')}
            direction="down"
          />
        )}
        <PickButton
          label={event.outcome_b_label}
          color={COLOR_B}
          onPress={() => triggerPick('b')}
          direction="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card - fills most of the screen
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#151528',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.card.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
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
    transform: [{ rotate: `${-OVERLAY_ROTATION}deg` }],
  },
  overlayLabelB: {
    transform: [{ rotate: `${OVERLAY_ROTATION}deg` }],
  },

  // Shimmer
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  foilBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
  },
  holoBands: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    width: 80,
  },
  holoBand: {
    width: 20,
    height: '100%',
  },

  // Image area - takes more vertical space
  imageArea: {
    flex: 1,
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
    fontSize: 100,
    lineHeight: 120,
    textAlign: 'center',
  },

  // Info section
  infoSection: {
    padding: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: '#151528',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  outcomesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  outcomeItem: {
    flex: 1,
    alignItems: 'center',
  },
  pickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: spacing[2],
    paddingTop: spacing[3],
    paddingHorizontal: spacing[1],
    width: CARD_WIDTH,
  },
  pickButtonWrap: {
    flex: 1,
    position: 'relative',
    height: 44,
  },
  pickButtonShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    bottom: -3,
    borderRadius: borderRadius.md,
  },
  pickButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[1],
  },
});
