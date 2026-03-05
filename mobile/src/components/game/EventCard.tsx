import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText, PixelCard } from '../common';
import { colors, spacing, borderRadius } from '../../lib/theme';
import { formatProbability, getTier, getTierColor } from '../../lib/scoring/calculator';
import type { Event, Outcome } from '../../types';

interface EventCardProps {
  event: Event;
  pickedOutcome?: Outcome;
  isCorrect?: boolean | null;
  pointsAwarded?: number;
  showResult?: boolean;
}

export function EventCard({
  event,
  pickedOutcome,
  isCorrect,
  pointsAwarded = 0,
  showResult = false,
}: EventCardProps) {
  const pickedLabel =
    pickedOutcome === 'a'
      ? event.outcome_a_label
      : pickedOutcome === 'b'
        ? event.outcome_b_label
        : event.outcome_draw_label || 'Draw';

  const pickedProbability =
    pickedOutcome === 'a'
      ? event.outcome_a_probability
      : pickedOutcome === 'b'
        ? event.outcome_b_probability
        : event.outcome_draw_probability ?? 0;

  const tier = getTier(pickedProbability);
  const tierColor = getTierColor(tier);

  return (
    <PixelCard
      variant={showResult ? (isCorrect ? 'highlight' : 'default') : 'default'}
      style={[
        styles.card,
        showResult && isCorrect && styles.correctCard,
        showResult && isCorrect === false && styles.incorrectCard,
      ]}
    >
      {/* Category */}
      <View style={styles.categoryRow}>
        <View style={styles.categoryBadge}>
          <PixelText variant="heading" size="xs" uppercase>
            {event.subcategory || event.category}
          </PixelText>
        </View>
      </View>

      {/* Title */}
      <PixelText variant="body" size="lg" style={styles.title} numberOfLines={2}>
        {event.title}
      </PixelText>

      {/* Pick info */}
      <View style={styles.pickRow}>
        <PixelText variant="body" size="base" color={colors.textMuted}>
          Picked:
        </PixelText>
        <PixelText
          variant="body"
          size="lg"
          color={pickedOutcome === 'a' ? colors.outcome.a : pickedOutcome === 'b' ? colors.outcome.b : colors.outcome.draw}
          style={styles.pickLabel}
        >
          {pickedLabel}
        </PixelText>
        <PixelText variant="body" size="base" color={tierColor}>
          @ {formatProbability(pickedProbability)}
        </PixelText>
      </View>

      {/* Result */}
      {showResult && isCorrect !== null && isCorrect !== undefined && (
        <View style={styles.resultRow}>
          <PixelText
            variant="heading"
            size="sm"
            color={isCorrect ? colors.game.success : colors.game.failure}
          >
            {isCorrect ? 'CORRECT' : 'WRONG'}
          </PixelText>
          {isCorrect && pointsAwarded > 0 && (
            <PixelText variant="body" size="lg" color={colors.game.gold}>
              +${pointsAwarded.toFixed(2)}
            </PixelText>
          )}
        </View>
      )}
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[2],
  },
  correctCard: {
    borderColor: colors.game.success,
  },
  incorrectCard: {
    borderColor: colors.game.failure,
    opacity: 0.8,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  categoryBadge: {
    backgroundColor: colors.game.secondary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  title: {
    marginBottom: spacing[2],
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pickLabel: {
    fontWeight: '700',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.card.border,
  },
});
