import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { colors, borderRadius, borderWidth, shadows } from '../../lib/theme';
import { PixelText } from '../common';

interface PackSpriteProps {
  type?: 'sports' | 'economy' | 'politics' | 'crypto' | 'default';
  size?: 'sm' | 'md' | 'lg';
  premium?: boolean;
  glowing?: boolean;
  disabled?: boolean;
}

const sizeDimensions = {
  sm: { width: 80, height: 100 },
  md: { width: 112, height: 140 },
  lg: { width: 144, height: 180 },
};

export function PackSprite({
  size = 'md',
  premium = false,
  glowing = false,
  disabled = false,
}: PackSpriteProps) {
  const dim = sizeDimensions[size];
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(glowing ? 1 : 0)).current;

  // Idle float animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  // Glow pulse
  useEffect(() => {
    if (glowing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [glowing, glowAnim]);

  const borderColor = premium ? colors.game.gold : colors.game.accent;
  const topStripeColor = premium ? colors.game.gold : colors.game.secondary;
  const midStripeColor = premium ? '#b8860b' : colors.game.primary;

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <Animated.View
      style={[
        {
          width: dim.width,
          height: dim.height,
          transform: [{ translateY: floatAnim }],
          opacity: disabled ? 0.4 : 1,
          shadowColor: premium ? colors.game.gold : colors.game.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: glowShadowRadius,
          shadowOpacity: glowShadowOpacity,
        },
      ]}
    >
      <View
        style={[
          styles.packBody,
          {
            borderColor,
            backgroundColor: premium ? '#1a1508' : colors.game.primary,
          },
        ]}
      >
        {/* Top stripe */}
        <View style={[styles.stripe, { backgroundColor: topStripeColor, top: '15%' }]} />
        {/* Middle stripe */}
        <View style={[styles.stripe, { backgroundColor: midStripeColor, top: '45%', height: '20%' }]} />
        {/* Bottom stripe */}
        <View style={[styles.stripe, { backgroundColor: topStripeColor, top: '75%' }]} />

        {/* Center emblem */}
        <View
          style={[
            styles.emblem,
            {
              backgroundColor: premium ? colors.game.gold : colors.game.accent,
              borderColor: premium ? '#b8860b' : '#c13550',
            },
          ]}
        >
          <PixelText
            variant="heading"
            size="xs"
            color={premium ? colors.black : colors.white}
          >
            {premium ? '$' : 'P'}
          </PixelText>
        </View>

        {/* Premium badge */}
        {premium && (
          <View style={styles.premiumBadge}>
            <PixelText variant="heading" size="xs" color={colors.black}>
              PRO
            </PixelText>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  packBody: {
    flex: 1,
    borderWidth: borderWidth.thick,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.pixelLg,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '10%',
    opacity: 0.6,
  },
  emblem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.game.gold,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
});
