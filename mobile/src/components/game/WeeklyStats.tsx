import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText } from '../common';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface WeeklyStatsProps {
  packsOpened: number;
  correctPicks: number;
  currentStreak: number;
}

export function WeeklyStats({
  packsOpened,
  correctPicks,
  currentStreak,
}: WeeklyStatsProps) {
  return (
    <View style={styles.row}>
      <StatBox value={packsOpened} label="PACKS" />
      <StatBox value={correctPicks} label="CORRECT" />
      <StatBox value={currentStreak} label="STREAK" />
    </View>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.box}>
      <PixelText variant="heading" size="lg" color={colors.foreground}>
        {String(value)}
      </PixelText>
      <PixelText variant="body" size="sm" color={colors.textMuted} uppercase>
        {label}
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    gap: spacing[1],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
});
