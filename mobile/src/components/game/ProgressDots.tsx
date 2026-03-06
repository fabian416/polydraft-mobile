import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { spacing } from '../../lib/theme';

interface ProgressDotsProps {
  total: number;
  current: number;
  completedCount: number;
}

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale]);

  return (
    <Animated.View
      style={[
        styles.dot,
        styles.dotCurrent,
        { transform: [{ scale }] },
      ]}
    />
  );
}

export function ProgressDots({ total, current, completedCount }: ProgressDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < completedCount;
        const isCurrent = i === current;

        if (isCurrent) {
          return <PulseDot key={i} />;
        }

        return (
          <View
            key={i}
            style={[
              styles.dot,
              isCompleted && styles.dotCompleted,
              !isCompleted && styles.dotPending,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotCompleted: {
    backgroundColor: '#4ade80',
  },
  dotCurrent: {
    backgroundColor: '#ffd700',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotPending: {
    backgroundColor: '#6b7280',
  },
});
