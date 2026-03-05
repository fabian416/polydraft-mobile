import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelCard, PixelText } from '../common';
import { colors, spacing } from '../../lib/theme';

interface WeeklyStatsProps {
  totalPoints: number;
  packsOpened: number;
  correctPicks: number;
  totalPicks: number;
  currentStreak: number;
  weeklyRank?: number | string;
}

export function WeeklyStats({
  totalPoints,
  packsOpened,
  correctPicks,
  totalPicks,
  currentStreak,
  weeklyRank,
}: WeeklyStatsProps) {
  const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;

  return (
    <PixelCard>
      {/* Header row: points + rank */}
      <View style={styles.headerRow}>
        <View>
          <PixelText variant="body" size="sm" color={colors.textMuted} uppercase>
            This Week
          </PixelText>
          <PixelText variant="heading" size="xl" color={colors.game.gold}>
            {totalPoints}
          </PixelText>
        </View>
        {weeklyRank !== undefined && (
          <View style={styles.rankContainer}>
            <PixelText variant="body" size="sm" color={colors.textMuted} uppercase>
              Rank
            </PixelText>
            <PixelText variant="heading" size="xl" color={colors.foreground}>
              #{weeklyRank}
            </PixelText>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatItem label="Packs" value={packsOpened} />
        <StatItem label="Correct" value={correctPicks} />
        <StatItem label="Accuracy" value={`${accuracy}%`} />
        <StatItem label="Streak" value={currentStreak} />
      </View>
    </PixelCard>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statItem}>
      <PixelText variant="body" size="lg" color={colors.foreground}>
        {String(value)}
      </PixelText>
      <PixelText variant="body" size="xs" color={colors.textMuted}>
        {label}
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  rankContainer: {
    alignItems: 'flex-end',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: spacing[3],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
});
