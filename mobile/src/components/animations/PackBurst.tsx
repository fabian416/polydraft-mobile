import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COLORS = ['#ffd700', '#e94560', '#3b82f6', '#a855f7', '#4ade80', '#f7dc6f', '#ff6b6b', '#00d2ff', '#ff9f43'];
const PARTICLE_COUNT = 40;
const CONFETTI_COUNT = 20;
const DURATION = 1800;

interface PackBurstProps {
  onComplete?: () => void;
}

// Exploding particle (circles and squares)
function Particle({ color, angle, speed, size, delay, shape }: {
  color: string; angle: number; speed: number; size: number; delay: number; shape: 'circle' | 'square' | 'rect';
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const dx = Math.cos(angle) * speed;
  const dy = Math.sin(angle) * speed;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dx],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, dy * 0.6, dy + 80], // gravity pull at end
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 1, 0.8, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.1, 0.3, 1],
    outputRange: [0, 2, 1.2, 0.2],
  });
  const rotateDeg = `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)}deg`;
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', rotateDeg],
  });

  const w = shape === 'rect' ? size * 2.5 : size;
  const h = shape === 'rect' ? size * 0.8 : size;
  const br = shape === 'circle' ? size / 2 : shape === 'rect' ? 2 : 3;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: w,
        height: h,
        borderRadius: br,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      }}
    />
  );
}

// Confetti strip (thin rectangles that flutter)
function ConfettiStrip({ color, angle, speed, delay }: {
  color: string; angle: number; speed: number; delay: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION + 400,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const dx = Math.cos(angle) * speed * 0.7;
  const dy = Math.sin(angle) * speed;

  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, dx, dx + (Math.random() - 0.5) * 40],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, dy * 0.4, dy + 150], // heavy gravity
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.6, 1],
    outputRange: [0, 1, 0.6, 0],
  });
  const rotateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${720 + Math.random() * 360}deg`],
  });
  const rotateZ = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${(Math.random() > 0.5 ? 1 : -1) * 180}deg`],
  });

  const w = 4 + Math.random() * 6;
  const h = 12 + Math.random() * 16;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: w,
        height: h,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotateX }, { rotateZ }],
      }}
    />
  );
}

// Flash overlay
function FlashOverlay() {
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flash, { toValue: 0.7, duration: 80, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: '#ffd700', opacity: flash }]}
      pointerEvents="none"
    />
  );
}

export function PackBurst({ onComplete }: PackBurstProps) {
  const particles = useMemo(() => {
    const shapes: Array<'circle' | 'square' | 'rect'> = ['circle', 'square', 'rect'];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      speed: 120 + Math.random() * 250,
      size: 5 + Math.random() * 12,
      delay: Math.random() * 60,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));
  }, []);

  const confetti = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i + PARTICLE_COUNT,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      angle: (i / CONFETTI_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8,
      speed: 80 + Math.random() * 180,
      delay: 50 + Math.random() * 150,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, DURATION + 300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      <FlashOverlay />
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
      {confetti.map((c) => (
        <ConfettiStrip key={c.id} {...c} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
