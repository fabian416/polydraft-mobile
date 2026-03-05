import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../lib/theme';

interface ProgressDotsProps {
  total: number;
  current: number;
  completedCount: number;
}

export function ProgressDots({ total, current, completedCount }: ProgressDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < completedCount;
        const isCurrent = i === current;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              isCompleted && styles.dotCompleted,
              isCurrent && styles.dotCurrent,
              !isCompleted && !isCurrent && styles.dotPending,
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
    backgroundColor: colors.game.success,
  },
  dotCurrent: {
    backgroundColor: colors.game.gold,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotPending: {
    backgroundColor: colors.card.border,
  },
});
