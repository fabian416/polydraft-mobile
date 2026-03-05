import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText, PixelCard, PixelButton } from '../common';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface PackSummaryProps {
  correctCount: number;
  totalPicks: number;
  totalPoints: number;
  onViewPack: () => void;
  onBackToGame: () => void;
}

export function PackSummary({
  correctCount,
  totalPicks,
  totalPoints,
  onViewPack,
  onBackToGame,
}: PackSummaryProps) {
  const accuracy = totalPicks > 0 ? Math.round((correctCount / totalPicks) * 100) : 0;

  return (
    <View style={styles.container}>
      <PixelCard variant="gold" style={styles.card}>
        {/* Header */}
        <PixelText variant="heading" size="xl" color={colors.game.gold} style={styles.title}>
          PACK COMPLETE!
        </PixelText>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <PixelText variant="body" size="3xl" color={colors.game.success}>
              {correctCount}/{totalPicks}
            </PixelText>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              HITS
            </PixelText>
          </View>

          <View style={styles.divider} />

          <View style={styles.stat}>
            <PixelText variant="body" size="3xl">
              {accuracy}%
            </PixelText>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              ACCURACY
            </PixelText>
          </View>
        </View>

        {/* Points */}
        <View style={styles.pointsSection}>
          <PixelText variant="heading" size="2xl" color={colors.game.gold}>
            ${totalPoints.toFixed(2)}
          </PixelText>
          <PixelText variant="body" size="base" color={colors.textMuted}>
            USD WON
          </PixelText>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <PixelButton
            title="View Pack"
            variant="gold"
            onPress={onViewPack}
            style={styles.button}
          />
          <PixelButton
            title="Back to Game"
            variant="outline"
            onPress={onBackToGame}
            style={styles.button}
          />
        </View>
      </PixelCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    zIndex: 50,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  title: {
    marginBottom: spacing[6],
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[5],
    marginBottom: spacing[6],
  },
  stat: {
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.card.border,
  },
  pointsSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.card.border,
    width: '100%',
  },
  buttons: {
    width: '100%',
    gap: spacing[3],
  },
  button: {
    width: '100%',
  },
});
