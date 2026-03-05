import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { PixelText } from '../common';
import { ProbabilityBar } from './ProbabilityBar';
import { colors, spacing, borderRadius, borderWidth, shadows } from '../../lib/theme';
import type { ExploreMarket } from '../../types';

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

interface ExploreCardProps {
  market: ExploreMarket;
  onPress: () => void;
  hasBet?: boolean;
}

export function ExploreCard({ market, onPress, hasBet = false }: ExploreCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = !!market.image_url && !imageError;

  const outcomeA = market.outcomes[0];
  const outcomeB = market.outcomes[1];

  return (
    <TouchableOpacity
      style={[styles.card, hasBet && styles.cardWithBet]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasBet && <View style={styles.betBadge} />}

      {/* Image */}
      <View style={styles.imageContainer}>
        {hasValidImage ? (
          <Image
            source={{ uri: market.image_url! }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <PixelText variant="heading" size="lg" color={colors.textMuted}>
              {getCategoryEmoji(market.category)}
            </PixelText>
          </View>
        )}
        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <PixelText variant="body" size="xs" color={colors.white} uppercase>
            {market.category}
          </PixelText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <PixelText
          variant="body"
          size="sm"
          color={colors.foreground}
          numberOfLines={2}
        >
          {market.title}
        </PixelText>

        {outcomeA && outcomeB && (
          <View style={styles.probabilityContainer}>
            <ProbabilityBar
              probabilityA={outcomeA.probability}
              probabilityB={outcomeB.probability}
              labelA={outcomeA.label}
              labelB={outcomeB.label}
              height={6}
              showLabels={false}
            />
            <View style={styles.probLabels}>
              <PixelText variant="body" size="xs" color={colors.outcome.a}>
                {Math.round(outcomeA.probability * 100)}%
              </PixelText>
              <PixelText variant="body" size="xs" color={colors.outcome.b}>
                {Math.round(outcomeB.probability * 100)}%
              </PixelText>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.bg,
    borderWidth: borderWidth.base,
    borderColor: colors.card.border,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.pixel,
  },
  cardWithBet: {
    borderColor: colors.game.gold + '50',
  },
  betBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.game.gold,
    borderWidth: 2,
    borderColor: colors.card.bg,
  },
  imageContainer: {
    aspectRatio: 4 / 3,
    width: '100%',
    backgroundColor: colors.game.secondary + '80',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing[1],
    left: spacing[1],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  content: {
    padding: spacing[2],
    gap: spacing[2],
  },
  probabilityContainer: {
    gap: spacing[1],
  },
  probLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
