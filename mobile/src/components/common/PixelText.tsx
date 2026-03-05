import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, fonts, fontSize as fontSizes, lineHeight as lineHeights } from '../../lib/theme';

type FontVariant = 'heading' | 'body' | 'mono';
type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

interface PixelTextProps extends TextProps {
  variant?: FontVariant;
  size?: TextSize;
  color?: string;
  uppercase?: boolean;
  shadow?: boolean;
  children: React.ReactNode;
}

export function PixelText({
  variant = 'body',
  size = 'base',
  color = colors.foreground,
  uppercase = false,
  shadow = false,
  style,
  children,
  ...props
}: PixelTextProps) {
  const fontFamily = fonts[variant];
  const fs = fontSizes[size];
  const lh = lineHeights[size];

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize: fs,
          lineHeight: lh,
          color,
        },
        uppercase && styles.uppercase,
        shadow && styles.shadow,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  uppercase: {
    textTransform: 'uppercase',
  },
  shadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
});
