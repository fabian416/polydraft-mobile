import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText } from '../common';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface PickChipProps {
  pickedLabel: string;
  isResolved: boolean;
  isRevealed: boolean;
  isCorrect?: boolean;
}

export function PickChip({ pickedLabel, isResolved, isRevealed, isCorrect }: PickChipProps) {
  const shortLabel = pickedLabel.slice(0, 3).toUpperCase();

  let bgColor = 'rgba(107, 114, 128, 0.2)';
  let textColor = '#9ca3af';
  let borderColor = '#4b5563';
  let icon = '?';

  if (isRevealed) {
    if (isCorrect) {
      bgColor = 'rgba(74, 222, 128, 0.2)';
      textColor = colors.game.success;
      borderColor = colors.game.success;
      icon = '\u2713';
    } else {
      bgColor = 'rgba(239, 68, 68, 0.2)';
      textColor = colors.game.failure;
      borderColor = colors.game.failure;
      icon = '\u2717';
    }
  } else if (isResolved) {
    bgColor = 'rgba(255, 215, 0, 0.2)';
    textColor = colors.game.gold;
    borderColor = colors.game.gold;
    icon = '!';
  }

  return (
    <View style={[styles.chip, { backgroundColor: bgColor, borderColor }]}>
      <PixelText variant="body" size="xs" color={textColor}>
        {shortLabel}
      </PixelText>
      <PixelText variant="body" size="xs" color={textColor} style={styles.icon}>
        {icon}
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  icon: {
    fontSize: 8,
  },
});
