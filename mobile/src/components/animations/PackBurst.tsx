import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COLORS = ['#ffd700', '#e94560', '#3b82f6', '#a855f7', '#4ade80', '#f7dc6f'];
const PARTICLE_COUNT = 24;
const DURATION = 1500;

interface PackBurstProps {
  onComplete?: () => void;
}

function Particle({ color, angle, speed, size, delay }: {
  color: string; angle: number; speed: number; size: number; delay: number;
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
    inputRange: [0, 1],
    outputRange: [0, dy],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1.5, 0.3],
  });
  const rotateEnd = `${(Math.random() > 0.5 ? 1 : -1) * 360}deg`;
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', rotateEnd],
  });

  const isCircle = Math.random() > 0.5;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: isCircle ? size / 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      }}
    />
  );
}

export function PackBurst({ onComplete }: PackBurstProps) {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      speed: 100 + Math.random() * 200,
      size: 6 + Math.random() * 10,
      delay: Math.random() * 100,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, DURATION + 200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
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
