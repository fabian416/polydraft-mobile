import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing } from '../../lib/theme';
import { PixelText } from '../common';

interface OutcomeDotsProps {
  total: number;
  current: number;
  bettedIndices?: number[];
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

export function OutcomeDots({ total, current, bettedIndices = [] }: OutcomeDotsProps) {
  const bettedSet = new Set(bettedIndices);

  return (
    <View style={styles.wrapper}>
      <PixelText style={styles.label}>
        {current + 1} / {total}
      </PixelText>
      <View style={styles.container}>
        {Array.from({ length: total }, (_, i) => {
          const isCurrent = i === current;
          const isBetted = bettedSet.has(i);
          const isSeen = i < current;

          if (isCurrent) {
            return <PulseDot key={i} />;
          }

          return (
            <View
              key={i}
              style={[
                styles.dot,
                isBetted && styles.dotBetted,
                !isBetted && isSeen && styles.dotSeen,
                !isBetted && !isSeen && styles.dotUnseen,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing[1],
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
  },
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
  dotCurrent: {
    backgroundColor: colors.game.gold,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotBetted: {
    backgroundColor: colors.game.success,
  },
  dotSeen: {
    backgroundColor: '#9ca3af',
  },
  dotUnseen: {
    backgroundColor: '#4b5563',
  },
});
