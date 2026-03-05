import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText } from '../common/PixelText';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface LeaderboardRowProps {
  rank: number;
  displayName: string;
  totalPoints: number;
  packsOpened: number;
  accuracy: number;
  isCurrentUser?: boolean;
  previousRank?: number;
}

const RANK_COLORS: Record<number, string> = {
  1: '#ffd700', // gold
  2: '#c0c0c0', // silver
  3: '#cd7f32', // bronze
};

function getRankChange(rank: number, previousRank?: number) {
  if (previousRank == null) return { symbol: '—', color: colors.textMuted };
  if (rank < previousRank) return { symbol: '↑', color: colors.game.success };
  if (rank > previousRank) return { symbol: '↓', color: colors.game.accent };
  return { symbol: '—', color: colors.textMuted };
}

export function LeaderboardRow({
  rank,
  displayName,
  totalPoints,
  packsOpened,
  accuracy,
  isCurrentUser,
  previousRank,
}: LeaderboardRowProps) {
  const rankColor = RANK_COLORS[rank] ?? colors.game.secondary;
  const isTopThree = rank <= 3;
  const change = getRankChange(rank, previousRank);

  return (
    <View
      style={[
        styles.container,
        isTopThree && styles.topThree,
        isCurrentUser && styles.currentUser,
      ]}
    >
      {/* Rank badge */}
      <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
        <PixelText
          variant="heading"
          size="xs"
          color={isTopThree ? colors.black : colors.white}
        >
          {String(rank)}
        </PixelText>
      </View>

      {/* Player info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <PixelText variant="body" size="lg" color={colors.foreground}>
            {displayName}
          </PixelText>
          {isCurrentUser && (
            <PixelText variant="body" size="sm" color={colors.game.success}>
              {' (You)'}
            </PixelText>
          )}
        </View>
        <PixelText variant="body" size="sm" color={colors.textMuted}>
          {packsOpened} packs  {(accuracy * 100).toFixed(0)}% acc
        </PixelText>
      </View>

      {/* Points + rank change */}
      <View style={styles.right}>
        <PixelText variant="heading" size="sm" color={colors.game.gold}>
          {totalPoints.toFixed(1)}
        </PixelText>
        <PixelText variant="body" size="sm" color={change.color}>
          {change.symbol}
        </PixelText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.card.border,
    backgroundColor: colors.card.bg,
    marginBottom: spacing[2],
  },
  topThree: {
    borderColor: colors.game.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
  },
  currentUser: {
    borderColor: colors.game.success,
    backgroundColor: 'rgba(74, 222, 128, 0.06)',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: spacing[2],
  },
});
