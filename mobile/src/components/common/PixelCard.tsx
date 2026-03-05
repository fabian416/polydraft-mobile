import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, borderRadius, borderWidth, shadows } from '../../lib/theme';

interface PixelCardProps extends ViewProps {
  variant?: 'default' | 'highlight' | 'gold';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const variantBorderColors: Record<string, string> = {
  default: colors.card.border,
  highlight: colors.game.accent,
  gold: colors.game.gold,
};

export function PixelCard({
  variant = 'default',
  style,
  children,
  ...props
}: PixelCardProps) {
  return (
    <View
      style={[
        styles.card,
        { borderColor: variantBorderColors[variant] },
        variant === 'gold' && shadows.glow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.bg,
    borderWidth: borderWidth.base,
    borderRadius: borderRadius.lg,
    padding: 16,
    // Pixel shadow
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
});
