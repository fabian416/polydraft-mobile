import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

interface ConfettiProps {
  count?: number;
  colors?: string[];
  duration?: number;
  spread?: number;
  delay?: number;
  active?: boolean;
  onComplete?: () => void;
}

const DEFAULT_COLORS = [
  '#ffd700', // gold
  '#ff6b6b', // red
  '#4ecdc4', // teal
  '#45b7d1', // blue
  '#f7dc6f', // yellow
  '#a855f7', // purple
  '#22c55e', // green
];

interface ConfettiParticle {
  id: number;
  color: string;
  startX: number;
  horizontalDrift: number;
  particleDelay: number;
  particleDuration: number;
  width: number;
  height: number;
  anim: Animated.Value;
}

export function Confetti({
  count = 30,
  colors = DEFAULT_COLORS,
  duration = 3000,
  spread = 400,
  delay = 0,
  active = true,
  onComplete,
}: ConfettiProps) {
  const [visible, setVisible] = useState(active);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;

  const particles = useMemo<ConfettiParticle[]>(() => {
    return [...Array(count)].map((_, i) => {
      const color = colors[i % colors.length];
      const startX = Math.random() * screenWidth;
      const horizontalDrift = (Math.random() - 0.5) * spread;
      const particleDelay = delay + Math.random() * 500;
      const particleDuration = duration + Math.random() * 1500;
      // Pixel-art aesthetic: small square blocks
      const isRect = Math.random() > 0.5;
      const width = isRect ? 4 : 6 + Math.random() * 4;
      const height = isRect ? 12 : 6 + Math.random() * 4;

      return {
        id: i,
        color,
        startX,
        horizontalDrift,
        particleDelay,
        particleDuration,
        width,
        height,
        anim: new Animated.Value(0),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);

    const animations = particles.map((p) =>
      Animated.sequence([
        Animated.delay(p.particleDelay),
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.particleDuration,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start(() => {
      setVisible(false);
      onCompleteRef.current?.();
    });
  }, [active, particles]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, screenHeight + 100],
        });
        const translateX = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.horizontalDrift],
        });
        const rotate = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${1080 * (Math.random() > 0.5 ? 1 : -1)}deg`],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.1, 0.7, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              {
                position: 'absolute',
                left: p.startX,
                top: -20,
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                transform: [{ translateY }, { translateX }, { rotate }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// Pre-configured variants
export function GoldConfetti({ count = 50, ...props }: Partial<ConfettiProps>) {
  return (
    <Confetti
      count={count}
      colors={['#ffd700', '#ffed4a', '#f7dc6f', '#ffc107', '#ffb300']}
      {...props}
    />
  );
}

export function VictoryConfetti({ count = 100, ...props }: Partial<ConfettiProps>) {
  return <Confetti count={count} duration={4000} spread={500} {...props} />;
}
