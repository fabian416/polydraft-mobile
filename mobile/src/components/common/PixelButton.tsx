import React, { useRef } from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, fonts, fontSize, borderRadius, borderWidth } from '../../lib/theme';
import { PixelText } from './PixelText';

type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'outline';

interface PixelButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const variantColors: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: colors.game.accent, text: colors.white, border: colors.black },
  secondary: { bg: colors.game.secondary, text: colors.white, border: colors.black },
  gold: { bg: colors.game.gold, text: colors.black, border: colors.black },
  outline: { bg: colors.transparent, text: colors.foreground, border: colors.border },
};

const sizeStyles: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: { paddingHorizontal: 12, paddingVertical: 8 },
  md: { paddingHorizontal: 24, paddingVertical: 12 },
  lg: { paddingHorizontal: 32, paddingVertical: 16 },
};

export function PixelButton({
  title,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  ...props
}: PixelButtonProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const colorSet = variantColors[variant];
  const sizeStyle = sizeStyles[size];

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 4, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          styles.button,
          sizeStyle,
          {
            backgroundColor: colorSet.bg,
            borderColor: colorSet.border,
            transform: [{ translateX }, { translateY }],
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <PixelText
          variant="heading"
          size={size === 'sm' ? 'xs' : 'sm'}
          color={colorSet.text}
          uppercase
        >
          {title}
        </PixelText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidth.base,
    borderRadius: borderRadius.md,
    // Pixel shadow
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
});
