import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function FloatingCard({ left, top, size, rotation, opacity, duration, delay }: {
  left: number; top: number; size: number; rotation: number;
  opacity: number; duration: number; delay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -10,
          duration: duration * 500,
          delay: Math.abs(delay) * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: duration * 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [translateY, duration, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size * 1.4,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        opacity,
        transform: [{ rotate: `${rotation}deg` }, { translateY }],
      }}
    />
  );
}

function Sparkle({ left, top, size, duration, delay }: {
  left: number; top: number; size: number; duration: number; delay: number;
}) {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: duration * 500,
          delay: Math.abs(delay) * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: duration * 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim, duration, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255, 215, 0, 0.6)',
        opacity: opacityAnim,
      }}
    />
  );
}

export function GameBackground() {
  const cards = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: rng() * (SCREEN_WIDTH * 0.9) + SCREEN_WIDTH * 0.05,
      top: rng() * (SCREEN_HEIGHT * 0.8) + SCREEN_HEIGHT * 0.1,
      size: 40 + rng() * 20,
      rotation: rng() * 60 - 30,
      opacity: 0.06 + rng() * 0.05,
      duration: 7 + rng() * 4,
      delay: -(rng() * 8),
    }));
  }, []);

  const sparkles = useMemo(() => {
    const rng = seededRandom(99);
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: rng() * (SCREEN_WIDTH * 0.96) + SCREEN_WIDTH * 0.02,
      top: rng() * (SCREEN_HEIGHT * 0.96) + SCREEN_HEIGHT * 0.02,
      size: 2 + rng() * 3,
      duration: 2 + rng() * 4,
      delay: -(rng() * 6),
    }));
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {cards.map((card) => (
        <FloatingCard key={card.id} {...card} />
      ))}
      {sparkles.map((s) => (
        <Sparkle key={s.id} {...s} />
      ))}
    </View>
  );
}
