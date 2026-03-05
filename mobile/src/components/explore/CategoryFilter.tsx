import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { PixelText } from '../common';
import { colors, spacing, borderRadius, borderWidth } from '../../lib/theme';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'sports', label: 'Sports' },
  { key: 'politics', label: 'Politics' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'economy', label: 'Economy' },
  { key: 'entertainment', label: 'Entertainment' },
] as const;

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selected === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSelect(cat.key)}
              activeOpacity={0.7}
            >
              <PixelText
                variant="body"
                size="sm"
                color={isActive ? colors.white : colors.textMuted}
                uppercase
              >
                {cat.label}
              </PixelText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: spacing[2],
  },
  container: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: borderWidth.thin,
    borderColor: colors.card.border,
    backgroundColor: colors.card.bg,
  },
  pillActive: {
    backgroundColor: colors.game.accent,
    borderColor: colors.game.accent,
  },
});
