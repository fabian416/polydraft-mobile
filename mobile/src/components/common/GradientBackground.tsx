import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../lib/theme';

// NOTE: Install expo-linear-gradient for true gradient support:
//   npx expo install expo-linear-gradient
// Then uncomment the LinearGradient import and usage below.

// import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function GradientBackground({
  style,
  children,
  ...props
}: GradientBackgroundProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      {/* Replace with LinearGradient once expo-linear-gradient is installed:
      <LinearGradient
        colors={[colors.background, colors.game.bg, colors.game.primary]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      /> */}
      <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallbackBg: {
    backgroundColor: colors.background,
  },
});
