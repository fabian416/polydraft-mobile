import React, { useState } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { PixelText } from '../common';
import { colors, spacing, borderRadius } from '../../lib/theme';
import type { ExploreMarket, ExploreOutcome } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing[4] * 2;

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('sport') || lower.includes('nba') || lower.includes('nfl')) return '(ball)';
  if (lower.includes('politic') || lower.includes('election')) return '(vote)';
  if (lower.includes('crypto') || lower.includes('bitcoin')) return '(btc)';
  if (lower.includes('econ') || lower.includes('finance')) return '(chart)';
  if (lower.includes('entertain') || lower.includes('oscar')) return '(film)';
  if (lower.includes('tech')) return '(tech)';
  return '(mkt)';
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toLocaleString()}`;
}

interface OutcomeCardProps {
  market: ExploreMarket;
  outcome: ExploreOutcome;
}

export function OutcomeCard({ market, outcome }: OutcomeCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = !!market.image_url && !imageError;
  const probability = Math.round(outcome.probability * 100);

  return (
    <View style={styles.card}>
      {/* Hero image */}
      <View style={styles.imageArea}>
        {hasValidImage ? (
          <Image
            source={{ uri: market.image_url! }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <PixelText variant="heading" size="3xl" color={colors.textMuted}>
              {getCategoryEmoji(market.category)}
            </PixelText>
          </View>
        )}

        {/* Image overlay gradient effect */}
        <View style={styles.imageOverlay} />

        {/* Category badge */}
        {market.category && (
          <View style={styles.categoryBadge}>
            <PixelText variant="heading" size="xs" color={colors.white} uppercase>
              {market.subcategory || market.category}
            </PixelText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Event title */}
        <PixelText
          variant="body"
          size="xl"
          color={colors.foreground}
          numberOfLines={3}
          style={styles.title}
        >
          {market.title}
        </PixelText>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Outcome row */}
        <View style={styles.outcomeRow}>
          <View style={styles.outcomeLabel}>
            <View style={styles.outcomeDot} />
            <PixelText variant="body" size="xl" color={colors.foreground} numberOfLines={1}>
              {outcome.label}
            </PixelText>
          </View>
          <PixelText variant="heading" size="2xl" color={colors.game.gold}>
            {probability}%
          </PixelText>
        </View>

        {/* Volume */}
        {market.volume > 0 && (
          <View style={styles.volumeRow}>
            <PixelText variant="body" size="sm" color={colors.textMuted}>
              Vol: {formatVolume(market.volume)}
            </PixelText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#151528',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: '#2a2a4a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  imageArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.game.secondary,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.game.primary,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(21, 21, 40, 0.6)',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  content: {
    padding: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  title: {
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a4a',
    marginVertical: spacing[1],
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outcomeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  outcomeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.game.gold,
  },
  volumeRow: {
    alignItems: 'center',
    marginTop: spacing[1],
  },
});
