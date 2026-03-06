import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelText } from '../common';
import { colors, spacing } from '../../lib/theme';

export function Header() {
  return (
    <View style={styles.container}>
      <PixelText variant="heading" size="lg" color={colors.foreground}>
        POLYDRAFT
      </PixelText>
      <View style={styles.rightRow}>
        <PixelText variant="body" color={colors.game.gold}>
          $0
        </PixelText>
        <PixelText variant="body" color={colors.textMuted}>
          #-
        </PixelText>
        <PixelText variant="body" color={colors.textMuted}>
          ↻
        </PixelText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: '#0a0a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
