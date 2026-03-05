import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { PixelText } from '../common';
import { colors, spacing, borderRadius, borderWidth } from '../../lib/theme';
import type { ExploreOutcome } from '../../types';

interface OutcomeSelectorProps {
  outcomes: ExploreOutcome[];
  selectedId?: string;
  onSelect: (outcome: ExploreOutcome) => void;
}

export function OutcomeSelector({
  outcomes,
  selectedId,
  onSelect,
}: OutcomeSelectorProps) {
  if (outcomes.length < 2) return null;

  const outcomeA = outcomes[0];
  const outcomeB = outcomes[1];
  const pctA = Math.round(outcomeA.probability * 100);
  const pctB = Math.round(outcomeB.probability * 100);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.option,
          styles.optionA,
          selectedId === outcomeA.id && styles.optionASelected,
        ]}
        onPress={() => onSelect(outcomeA)}
        activeOpacity={0.7}
      >
        <PixelText
          variant="body"
          size="lg"
          color={selectedId === outcomeA.id ? colors.white : colors.outcome.a}
          numberOfLines={1}
        >
          {outcomeA.label}
        </PixelText>
        <PixelText
          variant="heading"
          size="base"
          color={selectedId === outcomeA.id ? colors.white : colors.outcome.a}
        >
          {pctA}%
        </PixelText>
      </TouchableOpacity>

      <View style={styles.vsContainer}>
        <PixelText variant="heading" size="xs" color={colors.textMuted}>
          VS
        </PixelText>
      </View>

      <TouchableOpacity
        style={[
          styles.option,
          styles.optionB,
          selectedId === outcomeB.id && styles.optionBSelected,
        ]}
        onPress={() => onSelect(outcomeB)}
        activeOpacity={0.7}
      >
        <PixelText
          variant="body"
          size="lg"
          color={selectedId === outcomeB.id ? colors.white : colors.outcome.b}
          numberOfLines={1}
        >
          {outcomeB.label}
        </PixelText>
        <PixelText
          variant="heading"
          size="base"
          color={selectedId === outcomeB.id ? colors.white : colors.outcome.b}
        >
          {pctB}%
        </PixelText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.base,
  },
  optionA: {
    borderColor: colors.outcome.a + '60',
    backgroundColor: colors.outcome.a + '15',
  },
  optionASelected: {
    borderColor: colors.outcome.a,
    backgroundColor: colors.outcome.a + '40',
  },
  optionB: {
    borderColor: colors.outcome.b + '60',
    backgroundColor: colors.outcome.b + '15',
  },
  optionBSelected: {
    borderColor: colors.outcome.b,
    backgroundColor: colors.outcome.b + '40',
  },
  vsContainer: {
    width: 32,
    alignItems: 'center',
  },
});
