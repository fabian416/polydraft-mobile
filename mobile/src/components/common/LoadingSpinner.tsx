import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { colors, spacing } from '../../lib/theme';
import { PixelText } from './PixelText';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

const PIXEL_BLOCK_COUNT = 8;

export function LoadingSpinner({
  size = 32,
  color = colors.game.gold,
  label,
}: LoadingSpinnerProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spinAnim]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const blockSize = size / 4;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        {Array.from({ length: PIXEL_BLOCK_COUNT }).map((_, i) => {
          const angle = (i / PIXEL_BLOCK_COUNT) * 2 * Math.PI;
          const x = Math.cos(angle) * (size / 2 - blockSize / 2);
          const y = Math.sin(angle) * (size / 2 - blockSize / 2);
          const opacity = 0.3 + (i / PIXEL_BLOCK_COUNT) * 0.7;
          return (
            <View
              key={i}
              style={[
                styles.block,
                {
                  width: blockSize,
                  height: blockSize,
                  backgroundColor: color,
                  opacity,
                  left: size / 2 - blockSize / 2 + x,
                  top: size / 2 - blockSize / 2 + y,
                },
              ]}
            />
          );
        })}
      </Animated.View>
      {label && (
        <PixelText
          variant="body"
          size="sm"
          color={colors.textMuted}
          style={styles.label}
        >
          {label}
        </PixelText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  spinner: {
    position: 'relative',
  },
  block: {
    position: 'absolute',
  },
  label: {
    marginTop: spacing[3],
  },
});
