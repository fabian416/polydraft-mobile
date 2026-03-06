import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Easing, Image } from 'react-native';

interface PackSpriteProps {
  type?: 'sports' | 'economy' | 'politics' | 'crypto' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  premium?: boolean;
  glowing?: boolean;
  disabled?: boolean;
}

const freePackImage = require('../../../assets/images/sportpack_free.png');
const premiumPackImage = require('../../../assets/images/sportpack_premium.png');

const sizeDimensions = {
  sm: { width: 80, height: 100 },
  md: { width: 130, height: 170 },
  lg: { width: 170, height: 220 },
  xl: { width: 220, height: 286 },
};

export function PackSprite({
  size = 'md',
  premium = false,
  disabled = false,
}: PackSpriteProps) {
  const dim = sizeDimensions[size];
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  return (
    <Animated.View
      style={{
        width: dim.width,
        height: dim.height,
        transform: [{ translateY: floatAnim }],
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Image
        source={premium ? premiumPackImage : freePackImage}
        style={styles.packImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  packImage: {
    width: '100%',
    height: '100%',
  },
});
