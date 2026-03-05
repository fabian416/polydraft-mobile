import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText } from '../common/PixelText';
import { PixelCard } from '../common/PixelCard';
import { colors, spacing } from '../../lib/theme';

interface StatItem {
  label: string;
  value: string;
  color?: string;
}

interface ProfileStatsProps {
  stats: StatItem[];
}

export function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <PixelCard key={stat.label} style={styles.card}>
          <PixelText
            variant="heading"
            size="xl"
            color={stat.color ?? colors.foreground}
            style={styles.value}
          >
            {stat.value}
          </PixelText>
          <PixelText
            variant="body"
            size="sm"
            color={colors.textMuted}
          >
            {stat.label}
          </PixelText>
        </PixelCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  card: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  value: {
    marginBottom: spacing[1],
  },
});
