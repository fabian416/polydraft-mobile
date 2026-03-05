import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { PixelText, PixelCard } from '../common';
import { colors, spacing, borderRadius, borderWidth } from '../../lib/theme';
import { formatProbability, getTier, getTierColor } from '../../lib/scoring/calculator';
import { getEventRarity, getRarityConfig } from '../../lib/rarity';
import type { Event, Outcome } from '../../types';

interface DraftPickerProps {
  event: Event;
  position: number;
  total: number;
  onPick: (outcome: Outcome) => void;
}

export function DraftPicker({ event, position, total, onPick }: DraftPickerProps) {
  const tierA = getTier(event.outcome_a_probability);
  const tierB = getTier(event.outcome_b_probability);
  const colorA = getTierColor(tierA);
  const colorB = getTierColor(tierB);

  const rarity = event.rarityInfo?.rarity ?? getEventRarity(event.outcome_a_probability, event.outcome_b_probability);
  const rarityConfig = getRarityConfig(rarity);

  const isVsMatch = event.outcome_a_label !== 'Yes' && event.outcome_b_label !== 'No';

  return (
    <PixelCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.categoryBadge}>
            <PixelText variant="heading" size="xs" uppercase>
              {event.subcategory || event.category}
            </PixelText>
          </View>
          <View style={[styles.rarityBadge, { backgroundColor: rarityConfig.hex }]}>
            <PixelText variant="heading" size="xs" color={colors.white} uppercase>
              {rarityConfig.name}
            </PixelText>
          </View>
        </View>
        <PixelText variant="body" size="lg" color={colors.textMuted}>
          {position}/{total}
        </PixelText>
      </View>

      {/* Title */}
      <PixelText
        variant="body"
        size="xl"
        style={styles.title}
        numberOfLines={2}
      >
        {isVsMatch ? `${event.outcome_b_label} vs ${event.outcome_a_label}` : event.title}
      </PixelText>

      {/* Outcome buttons */}
      <View style={styles.outcomes}>
        {/* Option A */}
        <Pressable
          style={({ pressed }) => [
            styles.outcomeButton,
            { borderColor: colors.outcome.a },
            pressed && styles.outcomeButtonPressed,
          ]}
          onPress={() => onPick('a')}
        >
          <PixelText variant="body" size="xl" color={colors.outcome.a} style={styles.outcomeLabel}>
            {event.outcome_a_label}
          </PixelText>
          <PixelText variant="body" size="lg" color={colorA}>
            {formatProbability(event.outcome_a_probability)}
          </PixelText>
        </Pressable>

        {/* VS indicator */}
        <PixelText variant="heading" size="base" color={colors.textMuted}>
          {isVsMatch ? 'VS' : 'OR'}
        </PixelText>

        {/* Option B */}
        <Pressable
          style={({ pressed }) => [
            styles.outcomeButton,
            { borderColor: colors.outcome.b },
            pressed && styles.outcomeButtonPressed,
          ]}
          onPress={() => onPick('b')}
        >
          <PixelText variant="body" size="xl" color={colors.outcome.b} style={styles.outcomeLabel}>
            {event.outcome_b_label}
          </PixelText>
          <PixelText variant="body" size="lg" color={colorB}>
            {formatProbability(event.outcome_b_probability)}
          </PixelText>
        </Pressable>
      </View>

      {/* Draw option */}
      {event.supports_draw && event.outcome_draw_probability != null && (
        <Pressable
          style={({ pressed }) => [
            styles.drawButton,
            pressed && styles.outcomeButtonPressed,
          ]}
          onPress={() => onPick('draw')}
        >
          <PixelText variant="body" size="lg" color={colors.outcome.draw}>
            {event.outcome_draw_label || 'Draw'}: {formatProbability(event.outcome_draw_probability)}
          </PixelText>
        </Pressable>
      )}

      {/* Hint */}
      <PixelText variant="body" size="base" color={colors.textMuted} style={styles.hint}>
        Tap an outcome to pick
      </PixelText>
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  rarityBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  outcomes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  outcomeButton: {
    flex: 1,
    borderWidth: borderWidth.base,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  outcomeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  outcomeLabel: {
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  drawButton: {
    borderWidth: borderWidth.thin,
    borderColor: colors.outcome.draw,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    marginBottom: spacing[3],
    backgroundColor: 'rgba(168,85,247,0.05)',
  },
  hint: {
    textAlign: 'center',
  },
});
