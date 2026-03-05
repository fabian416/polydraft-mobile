import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText } from '../common';
import { colors, borderRadius, spacing } from '../../lib/theme';

interface ProbabilityBarProps {
  probabilityA: number;
  probabilityB: number;
  labelA?: string;
  labelB?: string;
  colorA?: string;
  colorB?: string;
  height?: number;
  showLabels?: boolean;
}

export function ProbabilityBar({
  probabilityA,
  probabilityB,
  labelA,
  labelB,
  colorA = colors.outcome.a,
  colorB = colors.outcome.b,
  height = 8,
  showLabels = true,
}: ProbabilityBarProps) {
  const pctA = Math.round(probabilityA * 100);
  const pctB = Math.round(probabilityB * 100);

  return (
    <View style={styles.container}>
      {showLabels && (
        <View style={styles.labelsRow}>
          <PixelText variant="body" size="xs" color={colorA}>
            {labelA || 'A'} {pctA}%
          </PixelText>
          <PixelText variant="body" size="xs" color={colorB}>
            {pctB}% {labelB || 'B'}
          </PixelText>
        </View>
      )}
      <View style={[styles.barTrack, { height }]}>
        <View
          style={[
            styles.barFillA,
            {
              width: `${pctA}%` as unknown as number,
              backgroundColor: colorA,
              height,
            },
          ]}
        />
        <View
          style={[
            styles.barFillB,
            {
              width: `${pctB}%` as unknown as number,
              backgroundColor: colorB,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  barTrack: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.card.border,
  },
  barFillA: {
    borderTopLeftRadius: borderRadius.full,
    borderBottomLeftRadius: borderRadius.full,
  },
  barFillB: {
    borderTopRightRadius: borderRadius.full,
    borderBottomRightRadius: borderRadius.full,
  },
});
